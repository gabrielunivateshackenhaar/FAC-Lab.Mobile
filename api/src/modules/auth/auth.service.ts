import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../../config/database';
import { env } from '../../config/env';
import { ConflictError, UnauthorizedError } from '../../core/errors/AppError';
import { UsuarioAutenticado } from '../../core/types/usuario';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { LoginInput, RegistroResponsavelInput } from './auth.schemas';

interface UsuarioBanco {
  id: string;
  email: string;
  senha_hash: string;
  papel: 'ADMINISTRADOR' | 'COLABORADOR' | 'RESPONSAVEL';
  status: 'ATIVO' | 'INATIVO' | 'PENDENTE_APROVACAO';
}

interface RespostaAutenticacao {
  accessToken: string;
  refreshToken: string;
  expiraEm: string;
  usuario: UsuarioAutenticado;
}

export class AuthService {
  private static gerarTokens(usuario: UsuarioAutenticado): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        papel: usuario.papel
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const id = crypto.randomUUID();

    const db = getDatabase();
    db.prepare(
      `INSERT INTO refresh_tokens (id, usuario_id, token, expira_em)
       VALUES (?, ?, ?, ?)`
    ).run(id, usuario.id, refreshToken, expiraEm);

    return { accessToken, refreshToken };
  }

  public static login(dados: LoginInput, enderecoIp?: string): RespostaAutenticacao {
    const db = getDatabase();
    const usuario = db
      .prepare('SELECT * FROM usuarios WHERE email = ?')
      .get(dados.email) as UsuarioBanco | undefined;

    if (!usuario) {
      throw new UnauthorizedError('Credenciais invalidas');
    }

    if (usuario.status !== 'ATIVO') {
      throw new UnauthorizedError('Usuario inativo ou com aprovacao pendente');
    }

    const senhaValida = bcrypt.compareSync(dados.senha, usuario.senha_hash);
    if (!senhaValida) {
      throw new UnauthorizedError('Credenciais invalidas');
    }

    const usuarioAutenticado: UsuarioAutenticado = {
      id: usuario.id,
      email: usuario.email,
      papel: usuario.papel
    };

    const tokens = this.gerarTokens(usuarioAutenticado);

    AuditoriaService.registrar({
      usuarioId: usuario.id,
      acao: 'CRIAR',
      recurso: 'autenticacao',
      recursoId: usuario.id,
      detalhes: { evento: 'login_sucesso' },
      enderecoIp
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiraEm: env.JWT_EXPIRES_IN,
      usuario: usuarioAutenticado
    };
  }

  public static renovarToken(tokenAtual: string, enderecoIp?: string): { accessToken: string; refreshToken: string; expiraEm: string } {
    const db = getDatabase();

    const registro = db
      .prepare(
        `SELECT rt.id, rt.usuario_id, rt.expira_em, u.email, u.papel, u.status
         FROM refresh_tokens rt
         JOIN usuarios u ON u.id = rt.usuario_id
         WHERE rt.token = ?`
      )
      .get(tokenAtual) as
      | {
          id: string;
          usuario_id: string;
          expira_em: string;
          email: string;
          papel: 'ADMINISTRADOR' | 'COLABORADOR' | 'RESPONSAVEL';
          status: string;
        }
      | undefined;

    if (!registro) {
      throw new UnauthorizedError('Refresh token invalido ou inexistente');
    }

    const expirado = new Date(registro.expira_em).getTime() < Date.now();
    if (expirado) {
      db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(registro.id);
      throw new UnauthorizedError('Refresh token expirado. Faca login novamente');
    }

    if (registro.status !== 'ATIVO') {
      throw new UnauthorizedError('Usuario inativo');
    }

    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(registro.id);

    const usuarioAutenticado: UsuarioAutenticado = {
      id: registro.usuario_id,
      email: registro.email,
      papel: registro.papel
    };

    const novosTokens = this.gerarTokens(usuarioAutenticado);

    AuditoriaService.registrar({
      usuarioId: registro.usuario_id,
      acao: 'ATUALIZAR',
      recurso: 'autenticacao',
      detalhes: { evento: 'refresh_token_sucesso' },
      enderecoIp
    });

    return {
      accessToken: novosTokens.accessToken,
      refreshToken: novosTokens.refreshToken,
      expiraEm: env.JWT_EXPIRES_IN
    };
  }

  public static registrarResponsavel(dados: RegistroResponsavelInput, enderecoIp?: string): RespostaAutenticacao {
    const db = getDatabase();

    const usuarioExistente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(dados.email);
    if (usuarioExistente) {
      throw new ConflictError('Email ja cadastrado no sistema');
    }

    if (dados.cpf) {
      const responsavelExistente = db.prepare('SELECT id FROM responsaveis WHERE cpf = ?').get(dados.cpf);
      if (responsavelExistente) {
        throw new ConflictError('CPF ja cadastrado no sistema');
      }
    }

    const usuarioId = crypto.randomUUID();
    const responsavelId = crypto.randomUUID();
    const senhaHash = bcrypt.hashSync(dados.senha, 10);

    const executarCadastro = db.transaction(() => {
      db.prepare(
        `INSERT INTO usuarios (id, email, senha_hash, papel, status)
         VALUES (?, ?, ?, 'RESPONSAVEL', 'ATIVO')`
      ).run(usuarioId, dados.email, senhaHash);

      db.prepare(
        `INSERT INTO responsaveis (id, usuario_id, nome, cpf, rg, parentesco, telefone, local_trabalho, telefone_trabalho)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        responsavelId,
        usuarioId,
        dados.nome,
        dados.cpf ?? null,
        dados.rg ?? null,
        dados.parentesco,
        dados.telefone,
        dados.localTrabalho ?? null,
        dados.telefoneTrabalho ?? null
      );
    });

    executarCadastro();

    const usuarioAutenticado: UsuarioAutenticado = {
      id: usuarioId,
      email: dados.email,
      papel: 'RESPONSAVEL'
    };

    const tokens = this.gerarTokens(usuarioAutenticado);

    AuditoriaService.registrar({
      usuarioId,
      acao: 'CRIAR',
      recurso: 'responsaveis',
      recursoId: responsavelId,
      detalhes: { evento: 'cadastro_responsavel', nome: dados.nome },
      enderecoIp
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiraEm: env.JWT_EXPIRES_IN,
      usuario: usuarioAutenticado
    };
  }

  public static logout(token: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);
  }
}
