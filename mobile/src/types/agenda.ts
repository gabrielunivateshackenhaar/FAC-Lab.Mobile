export type TipoEventoAgenda =
  | 'OFICINA'
  | 'REUNIAO_FAMILIAR'
  | 'ATENDIMENTO_INDIVIDUAL'
  | 'EVENTO_GERAL';

export interface EventoAgenda {
  id: string;
  unidade_id: string;
  turma_id?: string | null;
  titulo: string;
  descricao?: string | null;
  tipo_evento: TipoEventoAgenda;
  data_hora_inicio: string;
  data_hora_fim: string;
  eh_recorrente: number | boolean;
  regra_recorrencia?: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface FiltrosAgenda {
  dataInicio?: string;
  dataFim?: string;
  unidadeId?: string;
  turmaId?: string;
  tipoEvento?: TipoEventoAgenda;
}

export interface RequisicaoCriarEventoAgenda {
  unidadeId: string;
  turmaId?: string;
  titulo: string;
  descricao?: string;
  tipoEvento: TipoEventoAgenda;
  dataHoraInicio: string;
  dataHoraFim: string;
  ehRecorrente?: boolean;
  regraRecorrencia?: string;
}

export type RequisicaoAtualizarEventoAgenda = Partial<RequisicaoCriarEventoAgenda>;
