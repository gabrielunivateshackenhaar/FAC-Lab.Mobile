import crypto from 'crypto';
import { getDatabase } from '../../config/database';

export type AcaoAuditoria = 'CRIAR' | 'ATUALIZAR' | 'EXCLUIR' | 'VISUALIZAR_SENSIVEL';

export interface RegistrarAuditoriaParams {
  usuarioId?: string | null;
  acao: AcaoAuditoria;
  recurso: string;
  recursoId?: string | null;
  detalhes?: Record<string, unknown> | string | null;
  enderecoIp?: string | null;
}

export interface LogAuditoriaModel {
  id: string;
  usuario_id: string | null;
  usuario_email?: string | null;
  acao: AcaoAuditoria;
  recurso: string;
  recurso_id: string | null;
  detalhes: string | null;
  endereco_ip: string | null;
  criado_em: string;
}

export class AuditoriaService {
  public static registrar(params: RegistrarAuditoriaParams): void {
    try {
      const db = getDatabase();
      const id = crypto.randomUUID();
      const detalhesTexto =
        params.detalhes && typeof params.detalhes === 'object'
          ? JSON.stringify(params.detalhes)
          : (params.detalhes as string | null) ?? null;

      db.prepare(
        `INSERT INTO logs_auditoria (id, usuario_id, acao, recurso, recurso_id, detalhes, endereco_ip)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        params.usuarioId ?? null,
        params.acao,
        params.recurso,
        params.recursoId ?? null,
        detalhesTexto,
        params.enderecoIp ?? null
      );
    } catch (error) {
      console.error('Falha ao registrar log de auditoria:', error);
    }
  }

  public static listar(filtros: {
    usuarioId?: string;
    acao?: AcaoAuditoria;
    recurso?: string;
    dataInicio?: string;
    dataFim?: string;
    limite: number;
    pagina: number;
  }): LogAuditoriaModel[] {
    const db = getDatabase();
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (filtros.usuarioId) {
      whereClauses.push('l.usuario_id = ?');
      params.push(filtros.usuarioId);
    }

    if (filtros.acao) {
      whereClauses.push('l.acao = ?');
      params.push(filtros.acao);
    }

    if (filtros.recurso) {
      whereClauses.push('l.recurso = ?');
      params.push(filtros.recurso);
    }

    if (filtros.dataInicio) {
      whereClauses.push('l.criado_em >= ?');
      params.push(filtros.dataInicio);
    }

    if (filtros.dataFim) {
      whereClauses.push('l.criado_em <= ?');
      params.push(filtros.dataFim);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (filtros.pagina - 1) * filtros.limite;

    const sql = `
      SELECT l.*, u.email as usuario_email
      FROM logs_auditoria l
      LEFT JOIN usuarios u ON u.id = l.usuario_id
      ${whereSql}
      ORDER BY l.criado_em DESC
      LIMIT ? OFFSET ?
    `;

    params.push(filtros.limite, offset);

    return db.prepare(sql).all(...params) as LogAuditoriaModel[];
  }
}
