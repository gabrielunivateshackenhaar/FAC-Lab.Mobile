import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../../config/database';
import { ForbiddenError, NotFoundError } from '../../core/errors/AppError';
import { UsuarioAutenticado } from '../../core/types/usuario';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { TipoDocumento } from './documentos.schemas';

export interface DocumentoModel {
  id: string;
  matricula_id: string;
  tipo_documento: TipoDocumento;
  caminho_arquivo: string;
  nome_arquivo: string;
  tipo_mime: string;
  tamanho_bytes: number;
  enviado_em: string;
}

export class DocumentosService {
  private static verificarAcessoMatricula(matriculaId: string, usuario: UsuarioAutenticado): void {
    if (usuario.papel === 'ADMINISTRADOR') {
      return;
    }

    const db = getDatabase();
    const matricula = db.prepare('SELECT aluno_id FROM matriculas WHERE id = ?').get(matriculaId) as
      | { aluno_id: string }
      | undefined;

    if (!matricula) {
      throw new NotFoundError('Matricula vinculada nao encontrada');
    }

    if (usuario.papel === 'RESPONSAVEL') {
      const vinculo = db.prepare(
        `SELECT 1 FROM alunos_responsaveis ar
         INNER JOIN responsaveis r ON r.id = ar.responsavel_id
         WHERE ar.aluno_id = ? AND r.usuario_id = ?`
      ).get(matricula.aluno_id, usuario.id);

      if (!vinculo) {
        throw new ForbiddenError('Acesso restrito aos documentos do dependente vinculado');
      }
    }
  }

  public static salvar(
    matriculaId: string,
    file: Express.Multer.File,
    tipoDocumento: TipoDocumento,
    usuario: UsuarioAutenticado,
    ip?: string
  ): DocumentoModel {
    const db = getDatabase();

    const matricula = db.prepare('SELECT id FROM matriculas WHERE id = ?').get(matriculaId);
    if (!matricula) {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new NotFoundError('Matricula nao encontrada');
    }

    this.verificarAcessoMatricula(matriculaId, usuario);

    const documentoId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO documentos (
        id, matricula_id, tipo_documento, caminho_arquivo, nome_arquivo, tipo_mime, tamanho_bytes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      documentoId,
      matriculaId,
      tipoDocumento,
      file.filename,
      file.originalname,
      file.mimetype,
      file.size
    );

    AuditoriaService.registrar({
      usuarioId: usuario.id,
      acao: 'CRIAR',
      recurso: 'documentos',
      recursoId: documentoId,
      detalhes: { matriculaId, tipoDocumento, nomeArquivo: file.originalname },
      enderecoIp: ip
    });

    return db.prepare('SELECT * FROM documentos WHERE id = ?').get(documentoId) as DocumentoModel;
  }

  public static obterPorId(
    id: string,
    usuario: UsuarioAutenticado,
    ip?: string
  ): { documento: DocumentoModel; caminhoAbsoluto: string } {
    const db = getDatabase();
    const documento = db.prepare('SELECT * FROM documentos WHERE id = ?').get(id) as
      | DocumentoModel
      | undefined;

    if (!documento) {
      throw new NotFoundError('Documento nao encontrado');
    }

    this.verificarAcessoMatricula(documento.matricula_id, usuario);

    const caminhoAbsoluto = path.resolve(__dirname, '../../../files', documento.caminho_arquivo);

    if (!fs.existsSync(caminhoAbsoluto)) {
      throw new NotFoundError('Arquivo fisico nao localizado em disco');
    }

    AuditoriaService.registrar({
      usuarioId: usuario.id,
      acao: 'VISUALIZAR_SENSIVEL',
      recurso: 'documentos',
      recursoId: id,
      enderecoIp: ip
    });

    return { documento, caminhoAbsoluto };
  }

  public static excluir(id: string, usuario: UsuarioAutenticado, ip?: string): void {
    const db = getDatabase();
    const documento = db.prepare('SELECT * FROM documentos WHERE id = ?').get(id) as
      | DocumentoModel
      | undefined;

    if (!documento) {
      throw new NotFoundError('Documento nao encontrado');
    }

    this.verificarAcessoMatricula(documento.matricula_id, usuario);

    const caminhoAbsoluto = path.resolve(__dirname, '../../../files', documento.caminho_arquivo);
    if (fs.existsSync(caminhoAbsoluto)) {
      try {
        fs.unlinkSync(caminhoAbsoluto);
      } catch (err) {
        console.error('Erro ao excluir arquivo físico:', err);
      }
    }

    db.prepare('DELETE FROM documentos WHERE id = ?').run(id);

    AuditoriaService.registrar({
      usuarioId: usuario.id,
      acao: 'EXCLUIR',
      recurso: 'documentos',
      recursoId: id,
      detalhes: { matriculaId: documento.matricula_id, nomeArquivo: documento.nome_arquivo },
      enderecoIp: ip
    });
  }

  public static listarPorMatricula(matriculaId: string, usuario: UsuarioAutenticado): DocumentoModel[] {
    const db = getDatabase();
    this.verificarAcessoMatricula(matriculaId, usuario);

    return db.prepare(
      'SELECT * FROM documentos WHERE matricula_id = ? ORDER BY enviado_em DESC'
    ).all(matriculaId) as DocumentoModel[];
  }
}
