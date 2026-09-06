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
}
