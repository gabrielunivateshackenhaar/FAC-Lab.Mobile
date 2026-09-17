import { z } from 'zod';

export const itemPresencaSchema = z.object({
  alunoId: z.string().min(1, 'Identificador do aluno obrigatorio'),
  presente: z.boolean(),
  justificativa: z.string().optional()
});

export const registrarPresencasLoteBodySchema = z.object({
  presencas: z.array(itemPresencaSchema).min(1, 'Lista de presencas nao pode ser vazia')
});

export const obterPresencasEventoParamsSchema = z.object({
  eventoId: z.string().min(1, 'Identificador do evento obrigatorio')
});

export const obterFrequenciaAlunoParamsSchema = z.object({
  alunoId: z.string().min(1, 'Identificador do aluno obrigatorio')
});

export type ItemPresencaInput = z.infer<typeof itemPresencaSchema>;
export type RegistrarPresencasLoteInput = z.infer<typeof registrarPresencasLoteBodySchema>;
