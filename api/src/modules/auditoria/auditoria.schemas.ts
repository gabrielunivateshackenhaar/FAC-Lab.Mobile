import { z } from 'zod';

export const acaoAuditoriaEnum = z.enum(['CRIAR', 'ATUALIZAR', 'EXCLUIR', 'VISUALIZAR_SENSIVEL']);

export const listarAuditoriaQuerySchema = z.object({
  usuarioId: z.string().optional(),
  acao: acaoAuditoriaEnum.optional(),
  recurso: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  limite: z.coerce.number().int().positive().optional().default(50),
  pagina: z.coerce.number().int().positive().optional().default(1)
});

export type ListarAuditoriaQuery = z.infer<typeof listarAuditoriaQuerySchema>;
