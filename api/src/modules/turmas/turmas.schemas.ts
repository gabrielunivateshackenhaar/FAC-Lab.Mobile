import { z } from 'zod';

export const criarTurmaBodySchema = z.object({
  unidadeId: z.string().min(1, 'Identificador da unidade obrigatorio'),
  nome: z.string().min(2, 'Nome da turma deve ter no minimo 2 caracteres'),
  turno: z.enum(['MANHA', 'TARDE', 'INTEGRAL']),
  anoLetivo: z.number().int().min(2020).max(2050)
});

export const atualizarTurmaBodySchema = criarTurmaBodySchema.partial();

export const listarTurmasQuerySchema = z.object({
  unidadeId: z.string().optional(),
  anoLetivo: z.coerce.number().int().optional()
});

export const alocarAlunoBodySchema = z.object({
  alunoId: z.string().min(1, 'Identificador do aluno obrigatorio')
});

export const alocarAlunosLoteBodySchema = z.object({
  alunoIds: z.array(z.string().min(1)).min(1, 'Deve fornecer ao menos um aluno')
});

export const obterTurmaParamsSchema = z.object({
  id: z.string().min(1, 'Identificador da turma obrigatorio')
});

export const desalocarAlunoParamsSchema = z.object({
  id: z.string().min(1, 'Identificador da turma obrigatorio'),
  alunoId: z.string().min(1, 'Identificador do aluno obrigatorio')
});

export type CriarTurmaInput = z.infer<typeof criarTurmaBodySchema>;
export type AtualizarTurmaInput = z.infer<typeof atualizarTurmaBodySchema>;
export type ListarTurmasQuery = z.infer<typeof listarTurmasQuerySchema>;
