import type { PaginacaoConsulta } from './comum';

export type AcaoAuditoria = 'CRIAR' | 'ATUALIZAR' | 'EXCLUIR' | 'VISUALIZAR_SENSIVEL';

export interface LogAuditoria {
  id: string;
  usuario_id?: string | null;
  usuario_email?: string | null;
  acao: AcaoAuditoria;
  recurso: string;
  recurso_id?: string | null;
  detalhes?: unknown;
  endereco_ip?: string | null;
  criado_em: string;
}

export interface FiltrosAuditoria extends PaginacaoConsulta {
  usuarioId?: string;
  acao?: AcaoAuditoria;
  recurso?: string;
  dataInicio?: string;
  dataFim?: string;
}
