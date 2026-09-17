import crypto from 'crypto';
import { getDatabase } from '../../config/database';
import { NotFoundError } from '../../core/errors/AppError';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { AtualizarEventoInput, CriarEventoInput, ListarEventosQuery, TipoEvento } from './agenda.schemas';

export interface EventoAgendaModel {
  id: string;
  unidade_id: string;
  unidade_nome?: string;
  turma_id: string | null;
  turma_nome?: string | null;
  titulo: string;
  descricao: string | null;
  tipo_evento: TipoEvento;
  data_hora_inicio: string;
  data_hora_fim: string;
  eh_recorrente: number;
  regra_recorrencia: string | null;
  criado_em: string;
  atualizado_em: string;
}

export class AgendaService {
  public static criar(input: CriarEventoInput, usuarioId: string, ip?: string): EventoAgendaModel {
    const db = getDatabase();

    const unidade = db.prepare('SELECT id FROM unidades WHERE id = ?').get(input.unidadeId);
    if (!unidade) {
      throw new NotFoundError('Unidade institucional nao encontrada');
    }

    if (input.turmaId) {
      const turma = db.prepare('SELECT id FROM turmas WHERE id = ?').get(input.turmaId);
      if (!turma) {
        throw new NotFoundError('Turma nao encontrada');
      }
    }

    const eventoId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO eventos_agenda (
        id, unidade_id, turma_id, titulo, descricao, tipo_evento,
        data_hora_inicio, data_hora_fim, eh_recorrente, regra_recorrencia
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      eventoId,
      input.unidadeId,
      input.turmaId ?? null,
      input.titulo,
      input.descricao ?? null,
      input.tipoEvento,
      input.dataHoraInicio,
      input.dataHoraFim,
      input.ehRecorrente ? 1 : 0,
      input.regraRecorrencia ?? null
    );

    AuditoriaService.registrar({
      usuarioId,
      acao: 'CRIAR',
      recurso: 'eventos_agenda',
      recursoId: eventoId,
      detalhes: { titulo: input.titulo, tipoEvento: input.tipoEvento, inicio: input.dataHoraInicio },
      enderecoIp: ip
    });

    return this.obterPorId(eventoId);
  }

  public static listar(query: ListarEventosQuery): EventoAgendaModel[] {
    const db = getDatabase();
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (query.unidadeId) {
      whereClauses.push('e.unidade_id = ?');
      params.push(query.unidadeId);
    }

    if (query.turmaId) {
      whereClauses.push('e.turma_id = ?');
      params.push(query.turmaId);
    }

    if (query.tipoEvento) {
      whereClauses.push('e.tipo_evento = ?');
      params.push(query.tipoEvento);
    }

    if (query.dataInicio) {
      whereClauses.push('e.data_hora_fim >= ?');
      params.push(query.dataInicio);
    }

    if (query.dataFim) {
      whereClauses.push('e.data_hora_inicio <= ?');
      params.push(query.dataFim);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT e.*, u.nome as unidade_nome, t.nome as turma_nome
      FROM eventos_agenda e
      INNER JOIN unidades u ON u.id = e.unidade_id
      LEFT JOIN turmas t ON t.id = e.turma_id
      ${whereSql}
      ORDER BY e.data_hora_inicio ASC
    `;

    return db.prepare(sql).all(...params) as EventoAgendaModel[];
  }

  public static obterPorId(id: string): EventoAgendaModel {
    const db = getDatabase();
    const evento = db.prepare(
      `SELECT e.*, u.nome as unidade_nome, t.nome as turma_nome
       FROM eventos_agenda e
       INNER JOIN unidades u ON u.id = e.unidade_id
       LEFT JOIN turmas t ON t.id = e.turma_id
       WHERE e.id = ?`
    ).get(id) as EventoAgendaModel | undefined;

    if (!evento) {
      throw new NotFoundError('Evento de agenda nao encontrado');
    }

    return evento;
  }

  public static atualizar(
    id: string,
    input: AtualizarEventoInput,
    usuarioId: string,
    ip?: string
  ): EventoAgendaModel {
    const db = getDatabase();
    const evento = db.prepare('SELECT id FROM eventos_agenda WHERE id = ?').get(id);

    if (!evento) {
      throw new NotFoundError('Evento de agenda nao encontrado');
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.unidadeId !== undefined) {
      updates.push('unidade_id = ?');
      values.push(input.unidadeId);
    }
    if (input.turmaId !== undefined) {
      updates.push('turma_id = ?');
      values.push(input.turmaId);
    }
    if (input.titulo !== undefined) {
      updates.push('titulo = ?');
      values.push(input.titulo);
    }
    if (input.descricao !== undefined) {
      updates.push('descricao = ?');
      values.push(input.descricao);
    }
    if (input.tipoEvento !== undefined) {
      updates.push('tipo_evento = ?');
      values.push(input.tipoEvento);
    }
    if (input.dataHoraInicio !== undefined) {
      updates.push('data_hora_inicio = ?');
      values.push(input.dataHoraInicio);
    }
    if (input.dataHoraFim !== undefined) {
      updates.push('data_hora_fim = ?');
      values.push(input.dataHoraFim);
    }
    if (input.ehRecorrente !== undefined) {
      updates.push('eh_recorrente = ?');
      values.push(input.ehRecorrente ? 1 : 0);
    }
    if (input.regraRecorrencia !== undefined) {
      updates.push('regra_recorrencia = ?');
      values.push(input.regraRecorrencia);
    }

    if (updates.length > 0) {
      updates.push("atualizado_em = DATETIME('now')");
      values.push(id);

      db.prepare(`UPDATE eventos_agenda SET ${updates.join(', ')} WHERE id = ?`).run(...values);

      AuditoriaService.registrar({
        usuarioId,
        acao: 'ATUALIZAR',
        recurso: 'eventos_agenda',
        recursoId: id,
        detalhes: { alteracoes: updates },
        enderecoIp: ip
      });
    }

    return this.obterPorId(id);
  }

  public static excluir(id: string, usuarioId: string, ip?: string): void {
    const db = getDatabase();
    const evento = db.prepare('SELECT id FROM eventos_agenda WHERE id = ?').get(id);

    if (!evento) {
      throw new NotFoundError('Evento de agenda nao encontrado');
    }

    db.prepare('DELETE FROM eventos_agenda WHERE id = ?').run(id);

    AuditoriaService.registrar({
      usuarioId,
      acao: 'EXCLUIR',
      recurso: 'eventos_agenda',
      recursoId: id,
      enderecoIp: ip
    });
  }
}
