import crypto from 'crypto';
import { getDatabase } from '../../config/database';
import { ConflictError, ForbiddenError, NotFoundError } from '../../core/errors/AppError';
import { UsuarioAutenticado } from '../../core/types/usuario';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { DocumentoModel } from '../documentos/documentos.service';
import {
  HomologarMatriculaInput,
  ListarMatriculasQuery,
  SolicitarMatriculaInput,
  StatusMatricula,
  TipoMatricula
} from './matriculas.schemas';

export interface MatriculaModel {
  id: string;
  aluno_id: string;
  aluno_nome?: string;
  unidade_id: string;
  unidade_nome?: string;
  ano_letivo: number;
  tipo: TipoMatricula;
  status: StatusMatricula;
  renda_familiar: number | null;
  numero_dependentes: number | null;
  data_solicitacao: string;
  data_aprovacao: string | null;
  motivo_rejeicao: string | null;
  contribuicao_paga: number;
  criado_em: string;
  atualizado_em: string;
}

export interface MatriculaDetalhada extends MatriculaModel {
  documentos: DocumentoModel[];
}

export class MatriculasService {
  private static verificarResponsavelAluno(alunoId: string, usuarioId: string): void {
    const db = getDatabase();
    const vinculo = db.prepare(
      `SELECT 1 FROM alunos_responsaveis ar
       INNER JOIN responsaveis r ON r.id = ar.responsavel_id
       WHERE ar.aluno_id = ? AND r.usuario_id = ?`
    ).get(alunoId, usuarioId);

    if (!vinculo) {
      throw new ForbiddenError('Acesso restrito apenas aos dependentes vinculados ao responsavel');
    }
  }

  public static solicitar(
    input: SolicitarMatriculaInput,
    usuario: UsuarioAutenticado,
    ip?: string
  ): MatriculaModel {
    const db = getDatabase();

    const aluno = db.prepare('SELECT id FROM alunos WHERE id = ?').get(input.alunoId);
    if (!aluno) {
      throw new NotFoundError('Aluno nao encontrado');
    }

    const unidade = db.prepare('SELECT id FROM unidades WHERE id = ?').get(input.unidadeId);
    if (!unidade) {
      throw new NotFoundError('Unidade institucional nao encontrada');
    }

    if (usuario.papel === 'RESPONSAVEL') {
      this.verificarResponsavelAluno(input.alunoId, usuario.id);
    }

    const matriculaExistente = db.prepare(
      `SELECT id FROM matriculas
       WHERE aluno_id = ? AND ano_letivo = ? AND status NOT IN ('REJEITADA', 'CANCELADA')`
    ).get(input.alunoId, input.anoLetivo);

    if (matriculaExistente) {
      throw new ConflictError('Ja existe uma solicitacao ativa para este aluno no ano letivo selecionado');
    }

    const matriculaId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO matriculas (
        id, aluno_id, unidade_id, ano_letivo, tipo, status,
        renda_familiar, numero_dependentes
      ) VALUES (?, ?, ?, ?, ?, 'PENDENTE_PRESENCIAL', ?, ?)`
    ).run(
      matriculaId,
      input.alunoId,
      input.unidadeId,
      input.anoLetivo,
      input.tipo,
      input.rendaFamiliar ?? null,
      input.numeroDependentes ?? null
    );

    AuditoriaService.registrar({
      usuarioId: usuario.id,
      acao: 'CRIAR',
      recurso: 'matriculas',
      recursoId: matriculaId,
      detalhes: { alunoId: input.alunoId, unidadeId: input.unidadeId, anoLetivo: input.anoLetivo, tipo: input.tipo },
      enderecoIp: ip
    });

    return this.obterPorId(matriculaId, usuario);
  }

  public static listar(query: ListarMatriculasQuery, usuario: UsuarioAutenticado): MatriculaModel[] {
    const db = getDatabase();
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (usuario.papel === 'RESPONSAVEL') {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM alunos_responsaveis ar
        INNER JOIN responsaveis r ON r.id = ar.responsavel_id
        WHERE ar.aluno_id = m.aluno_id AND r.usuario_id = ?
      )`);
      params.push(usuario.id);
    }

    if (query.status) {
      whereClauses.push('m.status = ?');
      params.push(query.status);
    }

    if (query.unidadeId) {
      whereClauses.push('m.unidade_id = ?');
      params.push(query.unidadeId);
    }

    if (query.anoLetivo) {
      whereClauses.push('m.ano_letivo = ?');
      params.push(query.anoLetivo);
    }

    if (query.alunoId) {
      whereClauses.push('m.aluno_id = ?');
      params.push(query.alunoId);
    }

    if (query.tipo) {
      whereClauses.push('m.tipo = ?');
      params.push(query.tipo);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (query.pagina - 1) * query.limite;

    const sql = `
      SELECT m.*, a.nome_completo as aluno_nome, u.nome as unidade_nome
      FROM matriculas m
      INNER JOIN alunos a ON a.id = m.aluno_id
      INNER JOIN unidades u ON u.id = m.unidade_id
      ${whereSql}
      ORDER BY m.criado_em DESC
      LIMIT ? OFFSET ?
    `;

    params.push(query.limite, offset);

    return db.prepare(sql).all(...params) as MatriculaModel[];
  }

  public static obterPorId(id: string, usuario: UsuarioAutenticado): MatriculaDetalhada {
    const db = getDatabase();
    const matricula = db.prepare(
      `SELECT m.*, a.nome_completo as aluno_nome, u.nome as unidade_nome
       FROM matriculas m
       INNER JOIN alunos a ON a.id = m.aluno_id
       INNER JOIN unidades u ON u.id = m.unidade_id
       WHERE m.id = ?`
    ).get(id) as MatriculaModel | undefined;

    if (!matricula) {
      throw new NotFoundError('Matricula nao encontrada');
    }

    if (usuario.papel === 'RESPONSAVEL') {
      this.verificarResponsavelAluno(matricula.aluno_id, usuario.id);
    }

    const documentos = db.prepare(
      'SELECT * FROM documentos WHERE matricula_id = ? ORDER BY enviado_em DESC'
    ).all(id) as DocumentoModel[];

    return {
      ...matricula,
      documentos
    };
  }

  public static homologar(
    id: string,
    input: HomologarMatriculaInput,
    usuarioId: string,
    ip?: string
  ): MatriculaModel {
    const db = getDatabase();
    const matricula = db.prepare('SELECT * FROM matriculas WHERE id = ?').get(id) as MatriculaModel | undefined;

    if (!matricula) {
      throw new NotFoundError('Matricula nao encontrada');
    }

    if (matricula.status === 'APROVADA') {
      throw new ConflictError('Matricula ja se encontra homologada');
    }

    if (matricula.status === 'CANCELADA') {
      throw new ConflictError('Matricula cancelada nao pode ser homologada');
    }

    const transaction = db.transaction(() => {
      if (input.status === 'APROVADA') {
        db.prepare(
          `UPDATE matriculas
           SET status = 'APROVADA', data_aprovacao = DATE('now'), motivo_rejeicao = NULL, atualizado_em = DATETIME('now')
           WHERE id = ?`
        ).run(id);

        db.prepare(
          "UPDATE alunos SET status = 'ATIVO', atualizado_em = DATETIME('now') WHERE id = ?"
        ).run(matricula.aluno_id);
      } else {
        db.prepare(
          `UPDATE matriculas
           SET status = 'REJEITADA', motivo_rejeicao = ?, atualizado_em = DATETIME('now')
           WHERE id = ?`
        ).run(input.motivoRejeicao ?? null, id);
      }
    });

    transaction();

    AuditoriaService.registrar({
      usuarioId,
      acao: 'ATUALIZAR',
      recurso: 'matriculas',
      recursoId: id,
      detalhes: { acaoHomologacao: input.status, motivoRejeicao: input.motivoRejeicao },
      enderecoIp: ip
    });

    return db.prepare('SELECT * FROM matriculas WHERE id = ?').get(id) as MatriculaModel;
  }

  public static confirmarContribuicao(
    id: string,
    contribuicaoPaga: boolean,
    usuarioId: string,
    ip?: string
  ): MatriculaModel {
    const db = getDatabase();
    const matricula = db.prepare('SELECT id FROM matriculas WHERE id = ?').get(id);

    if (!matricula) {
      throw new NotFoundError('Matricula nao encontrada');
    }

    db.prepare(
      `UPDATE matriculas
       SET contribuicao_paga = ?, atualizado_em = DATETIME('now')
       WHERE id = ?`
    ).run(contribuicaoPaga ? 1 : 0, id);

    AuditoriaService.registrar({
      usuarioId,
      acao: 'ATUALIZAR',
      recurso: 'matriculas',
      recursoId: id,
      detalhes: { contribuicaoPaga },
      enderecoIp: ip
    });

    return db.prepare('SELECT * FROM matriculas WHERE id = ?').get(id) as MatriculaModel;
  }

  public static cancelar(id: string, usuario: UsuarioAutenticado, ip?: string): void {
    const db = getDatabase();
    const matricula = db.prepare('SELECT * FROM matriculas WHERE id = ?').get(id) as MatriculaModel | undefined;

    if (!matricula) {
      throw new NotFoundError('Matricula nao encontrada');
    }

    if (usuario.papel === 'RESPONSAVEL') {
      this.verificarResponsavelAluno(matricula.aluno_id, usuario.id);
    }

    if (matricula.status === 'APROVADA') {
      throw new ConflictError('Nao e permitido cancelar uma matricula que ja foi formalmente aprovada');
    }

    db.prepare(
      `UPDATE matriculas
       SET status = 'CANCELADA', atualizado_em = DATETIME('now')
       WHERE id = ?`
    ).run(id);

    AuditoriaService.registrar({
      usuarioId: usuario.id,
      acao: 'ATUALIZAR',
      recurso: 'matriculas',
      recursoId: id,
      detalhes: { acao: 'CANCELAMENTO' },
      enderecoIp: ip
    });
  }
}
