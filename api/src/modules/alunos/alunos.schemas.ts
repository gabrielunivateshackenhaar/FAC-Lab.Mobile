import { z } from 'zod';

export const criarAlunoBodySchema = z.object({
  nomeCompleto: z.string().min(2, 'Nome completo deve ter ao menos 2 caracteres'),
  sexo: z.enum(['M', 'F', 'OUTRO']).optional(),
  dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data deve ser YYYY-MM-DD'),
  naturalidade: z.string().optional(),
  ufNaturalidade: z.string().max(2).optional(),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 digitos numericos').optional(),
  rg: z.string().optional(),
  religiao: z.string().optional(),
  enderecoLogradouro: z.string().min(1, 'Logradouro e obrigatorio'),
  enderecoNumero: z.string().min(1, 'Numero do endereco e obrigatorio'),
  enderecoBairro: z.string().min(1, 'Bairro e obrigatorio'),
  enderecoCidade: z.string().min(1, 'Cidade e obrigatoria'),
  telefoneRecado: z.string().optional(),
  problemasSaude: z.string().optional(),
  escolaRegular: z.string().optional(),
  serieEscolar: z.string().optional(),
  situacaoMoradia: z.enum(['PROPRIA', 'ALUGADA', 'CEDIDA', 'OUTRO']).optional(),
  vinculoMatrimonialPais: z.string().optional(),
  fotoUrl: z.string().optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'LISTA_ESPERA']).optional().default('ATIVO'),
  observacoes: z.string().optional(),
  responsavelId: z.string().optional(),
  contatoPrincipal: z.boolean().optional().default(true)
});

export const atualizarAlunoBodySchema = criarAlunoBodySchema.partial();

export const listarAlunosQuerySchema = z.object({
  nome: z.string().optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'LISTA_ESPERA']).optional(),
  unidadeId: z.string().optional(),
  turmaId: z.string().optional(),
  limite: z.coerce.number().int().positive().optional().default(50),
  pagina: z.coerce.number().int().positive().optional().default(1)
});

export const vincularResponsavelBodySchema = z.object({
  responsavelId: z.string().min(1, 'Identificador do responsavel obrigatorio'),
  contatoPrincipal: z.boolean().optional().default(false)
});

export const obterAlunoParamsSchema = z.object({
  id: z.string().min(1, 'Identificador do aluno obrigatorio')
});

export const desvincularResponsavelParamsSchema = z.object({
  id: z.string().min(1, 'Identificador do aluno obrigatorio'),
  responsavelId: z.string().min(1, 'Identificador do responsavel obrigatorio')
});

export type CriarAlunoInput = z.infer<typeof criarAlunoBodySchema>;
export type AtualizarAlunoInput = z.infer<typeof atualizarAlunoBodySchema>;
export type ListarAlunosQuery = z.infer<typeof listarAlunosQuerySchema>;
export type VincularResponsavelInput = z.infer<typeof vincularResponsavelBodySchema>;
