export type Turno = 'MANHA' | 'TARDE' | 'INTEGRAL';

export interface Turma {
  id: string;
  unidade_id: string;
  nome: string;
  turno: Turno;
  ano_letivo: number;
  criado_em: string;
  atualizado_em: string;
  total_alunos?: number;
}

export interface AlunoTurma {
  id: string;
  nome_completo: string;
  data_nascimento: string;
  status: string;
  enturmado_em: string;
}

export interface FiltrosTurma {
  unidadeId?: string;
  anoLetivo?: number;
}

export interface RequisicaoCriarTurma {
  unidadeId: string;
  nome: string;
  turno: Turno;
  anoLetivo: number;
}

export type RequisicaoAtualizarTurma = Partial<RequisicaoCriarTurma>;
