import type { PaginacaoConsulta } from './comum';

export type Sexo = 'M' | 'F' | 'OUTRO';

export type StatusAluno = 'ATIVO' | 'INATIVO' | 'LISTA_ESPERA';

export type SituacaoMoradia = 'PROPRIA' | 'ALUGADA' | 'CEDIDA' | 'OUTRO';

export interface ResponsavelVinculado {
  id: string;
  nome: string;
  parentesco: string;
  telefone: string;
  contato_principal: boolean | number;
}

export interface AlunoResumo {
  id: string;
  nome_completo: string;
  sexo?: Sexo | null;
  data_nascimento: string;
  status: StatusAluno;
  endereco_cidade?: string;
  foto_url?: string | null;
}

export interface Aluno extends AlunoResumo {
  naturalidade?: string | null;
  uf_naturalidade?: string | null;
  cpf?: string | null;
  rg?: string | null;
  religiao?: string | null;
  endereco_logradouro: string;
  endereco_numero: string;
  endereco_bairro: string;
  telefone_recado?: string | null;
  problemas_saude?: string | null;
  escola_regular?: string | null;
  serie_escolar?: string | null;
  situacao_moradia?: SituacaoMoradia | null;
  vinculo_matrimonial_pais?: string | null;
  observacoes?: string | null;
  criado_em: string;
  atualizado_em: string;
  responsaveis?: ResponsavelVinculado[];
}

export interface FiltrosAluno extends PaginacaoConsulta {
  nome?: string;
  status?: StatusAluno;
  unidadeId?: string;
  turmaId?: string;
}

export interface RequisicaoCriarAluno {
  nomeCompleto: string;
  sexo?: Sexo;
  dataNascimento: string;
  naturalidade?: string;
  ufNaturalidade?: string;
  cpf?: string;
  rg?: string;
  religiao?: string;
  enderecoLogradouro: string;
  enderecoNumero: string;
  enderecoBairro: string;
  enderecoCidade: string;
  telefoneRecado?: string;
  problemasSaude?: string;
  escolaRegular?: string;
  serieEscolar?: string;
  situacaoMoradia?: SituacaoMoradia;
  vinculoMatrimonialPais?: string;
  fotoUrl?: string;
  status?: StatusAluno;
  observacoes?: string;
  responsavelId?: string;
  contatoPrincipal?: boolean;
}

export type RequisicaoAtualizarAluno = Partial<RequisicaoCriarAluno>;
