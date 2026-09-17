import { z } from 'zod';

export const obterUnidadeParamsSchema = z.object({
  id: z.string().min(1, 'Identificador da unidade obrigatorio')
});

export type ObterUnidadeParams = z.infer<typeof obterUnidadeParamsSchema>;
