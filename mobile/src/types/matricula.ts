import type { PaginacaoConsulta } from './comum';
import type { Documento } from './documento';

export type TipoMatricula = 'PRE_INSCRICAO' | 'MATRICULA_NOVA' | 'REMATRICULA';

export type StatusMatricula =
  | 'PENDENTE_PRESENCIAL'
  | 'ENVIADA'
  | 'APROVADA'
  | 'REJEITADA'
  | 'CANCELADA';

export interface Matricula {
  id: string;
  aluno_id: string;
  unidade_id: string;
  ano_letivo: number;
  tipo: TipoMatricula;
  status: StatusMatricula;
  renda_familiar?: number | null;
  numero_dependentes?: number | null;
  data_solicitacao: string;
  data_aprovacao?: string | null;
  motivo_rejeicao?: string | null;
  contribuicao_paga: number | boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface MatriculaDetalhada extends Matricula {
  documentos?: Documento[];
}

export interface FiltrosMatricula extends PaginacaoConsulta {
  status?: StatusMatricula;
  unidadeId?: string;
  anoLetivo?: number;
  alunoId?: string;
  tipo?: TipoMatricula;
}

export interface RequisicaoCriarMatricula {
  alunoId: string;
  unidadeId: string;
  anoLetivo: number;
  tipo: TipoMatricula;
  rendaFamiliar?: number;
  numeroDependentes?: number;
}

export interface RequisicaoHomologarMatricula {
  status: 'APROVADA' | 'REJEITADA';
  motivoRejeicao?: string;
}

export interface RequisicaoContribuicaoMatricula {
  contribuicaoPaga: boolean;
}
