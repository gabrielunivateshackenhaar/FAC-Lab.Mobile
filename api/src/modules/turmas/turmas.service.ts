import crypto from 'crypto';
import { getDatabase } from '../../config/database';
import { NotFoundError } from '../../core/errors/AppError';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { AtualizarTurmaInput, CriarTurmaInput, ListarTurmasQuery } from './turmas.schemas';

export interface TurmaModel {
  id: string;
  unidade_id: string;
  unidade_nome?: string;
  nome: string;
  turno: 'MANHA' | 'TARDE' | 'INTEGRAL';
  ano_letivo: number;
  total_alunos?: number;
  criado_em: string;
  atualizado_em: string;
}

export interface AlunoEnturmado {
  id: string;
  nome_completo: string;
  data_nascimento: string;
  status: string;
  enturmado_em: string;
}

export class TurmasService {
  public static criar(input: CriarTurmaInput, usuarioId: string, ip?: string): TurmaModel {
    const db = getDatabase();

    const unidade = db.prepare('SELECT id FROM unidades WHERE id = ?').get(input.unidadeId);
    if (!unidade) {
      throw new NotFoundError('Unidade institucional nao encontrada');
    }

    const turmaId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO turmas (id, unidade_id, nome, turno, ano_letivo)
       VALUES (?, ?, ?, ?, ?)`
    ).run(turmaId, input.unidadeId, input.nome, input.turno, input.anoLetivo);

    AuditoriaService.registrar({
      usuarioId,
      acao: 'CRIAR',
      recurso: 'turmas',
      recursoId: turmaId,
      detalhes: { nome: input.nome, turno: input.turno, anoLetivo: input.anoLetivo },
      enderecoIp: ip
    });

    return db.prepare('SELECT * FROM turmas WHERE id = ?').get(turmaId) as TurmaModel;
  }

  public static listar(query: ListarTurmasQuery): TurmaModel[] {
    const db = getDatabase();
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (query.unidadeId) {
      whereClauses.push('t.unidade_id = ?');
      params.push(query.unidadeId);
    }

    if (query.anoLetivo) {
      whereClauses.push('t.ano_letivo = ?');
      params.push(query.anoLetivo);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT t.*, u.nome as unidade_nome,
             (SELECT count(*) FROM turmas_alunos ta WHERE ta.turma_id = t.id) as total_alunos
      FROM turmas t
      INNER JOIN unidades u ON u.id = t.unidade_id
      ${whereSql}
      ORDER BY t.ano_letivo DESC, t.nome ASC
    `;

    return db.prepare(sql).all(...params) as TurmaModel[];
  }

  public static obterPorId(id: string): TurmaModel {
    const db = getDatabase();
    const turma = db.prepare(
      `SELECT t.*, u.nome as unidade_nome,
              (SELECT count(*) FROM turmas_alunos ta WHERE ta.turma_id = t.id) as total_alunos
       FROM turmas t
       INNER JOIN unidades u ON u.id = t.unidade_id
       WHERE t.id = ?`
    ).get(id) as TurmaModel | undefined;

    if (!turma) {
      throw new NotFoundError('Turma nao encontrada');
    }

    return turma;
  }

  public static atualizar(id: string, input: AtualizarTurmaInput, usuarioId: string, ip?: string): TurmaModel {
    const db = getDatabase();
    const turma = db.prepare('SELECT id FROM turmas WHERE id = ?').get(id);

    if (!turma) {
      throw new NotFoundError('Turma nao encontrada');
    }

    if (input.unidadeId) {
      const unidade = db.prepare('SELECT id FROM unidades WHERE id = ?').get(input.unidadeId);
      if (!unidade) {
        throw new NotFoundError('Unidade institucional nao encontrada');
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.unidadeId !== undefined) {
      updates.push('unidade_id = ?');
      values.push(input.unidadeId);
    }
    if (input.nome !== undefined) {
      updates.push('nome = ?');
      values.push(input.nome);
    }
    if (input.turno !== undefined) {
      updates.push('turno = ?');
      values.push(input.turno);
    }
    if (input.anoLetivo !== undefined) {
      updates.push('ano_letivo = ?');
      values.push(input.anoLetivo);
    }

    if (updates.length > 0) {
      updates.push("atualizado_em = DATETIME('now')");
      values.push(id);
      db.prepare(`UPDATE turmas SET ${updates.join(', ')} WHERE id = ?`).run(...values);

      AuditoriaService.registrar({
        usuarioId,
        acao: 'ATUALIZAR',
        recurso: 'turmas',
        recursoId: id,
        detalhes: { alteracoes: updates },
        enderecoIp: ip
      });
    }

    return this.obterPorId(id);
  }

  public static excluir(id: string, usuarioId: string, ip?: string): void {
    const db = getDatabase();
    const turma = db.prepare('SELECT id FROM turmas WHERE id = ?').get(id);

    if (!turma) {
      throw new NotFoundError('Turma nao encontrada');
    }

    db.prepare('DELETE FROM turmas WHERE id = ?').run(id);

    AuditoriaService.registrar({
      usuarioId,
      acao: 'EXCLUIR',
      recurso: 'turmas',
      recursoId: id,
      enderecoIp: ip
    });
  }

  public static alocarAluno(turmaId: string, alunoId: string, usuarioId: string): void {
    const db = getDatabase();

    const turma = db.prepare('SELECT id FROM turmas WHERE id = ?').get(turmaId);
    if (!turma) {
      throw new NotFoundError('Turma nao encontrada');
    }

    const aluno = db.prepare('SELECT id FROM alunos WHERE id = ?').get(alunoId);
    if (!aluno) {
      throw new NotFoundError('Aluno nao encontrado');
    }

    db.prepare(
      `INSERT OR IGNORE INTO turmas_alunos (turma_id, aluno_id)
       VALUES (?, ?)`
    ).run(turmaId, alunoId);

    AuditoriaService.registrar({
      usuarioId,
      acao: 'CRIAR',
      recurso: 'turmas_alunos',
      recursoId: `${turmaId}:${alunoId}`,
      detalhes: { turmaId, alunoId }
    });
  }

  public static alocarAlunosLote(turmaId: string, alunoIds: string[], usuarioId: string): void {
    const db = getDatabase();

    const turma = db.prepare('SELECT id FROM turmas WHERE id = ?').get(turmaId);
    if (!turma) {
      throw new NotFoundError('Turma nao encontrada');
    }

    const insertStmt = db.prepare(
      `INSERT OR IGNORE INTO turmas_alunos (turma_id, aluno_id)
       VALUES (?, ?)`
    );

    const alocacaoTransaction = db.transaction((ids: string[]) => {
      for (const alunoId of ids) {
        insertStmt.run(turmaId, alunoId);
      }
    });

    alocacaoTransaction(alunoIds);

    AuditoriaService.registrar({
      usuarioId,
      acao: 'CRIAR',
      recurso: 'turmas_alunos',
      recursoId: turmaId,
      detalhes: { totalAlunosAlocados: alunoIds.length }
    });
  }

  public static desalocarAluno(turmaId: string, alunoId: string, usuarioId: string): void {
    const db = getDatabase();

    const enturmacao = db.prepare(
      'SELECT 1 FROM turmas_alunos WHERE turma_id = ? AND aluno_id = ?'
    ).get(turmaId, alunoId);

    if (!enturmacao) {
      throw new NotFoundError('Aluno nao se encontra enturmado nesta turma');
    }

    db.prepare('DELETE FROM turmas_alunos WHERE turma_id = ? AND aluno_id = ?').run(turmaId, alunoId);

    AuditoriaService.registrar({
      usuarioId,
      acao: 'EXCLUIR',
      recurso: 'turmas_alunos',
      recursoId: `${turmaId}:${alunoId}`,
      detalhes: { turmaId, alunoId }
    });
  }

  public static listarAlunos(turmaId: string): AlunoEnturmado[] {
    const db = getDatabase();

    const turma = db.prepare('SELECT id FROM turmas WHERE id = ?').get(turmaId);
    if (!turma) {
      throw new NotFoundError('Turma nao encontrada');
    }

    return db.prepare(
      `SELECT a.id, a.nome_completo, a.data_nascimento, a.status, ta.enturmado_em
       FROM alunos a
       INNER JOIN turmas_alunos ta ON ta.aluno_id = a.id
       WHERE ta.turma_id = ?
       ORDER BY a.nome_completo ASC`
    ).all(turmaId) as AlunoEnturmado[];
  }
}
