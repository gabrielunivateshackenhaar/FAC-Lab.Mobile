import { z } from 'zod';

export const tipoEventoEnum = z.enum([
  'OFICINA',
  'REUNIAO_FAMILIAR',
  'ATENDIMENTO_INDIVIDUAL',
  'EVENTO_GERAL'
]);

const eventoBaseSchema = z.object({
  unidadeId: z.string().min(1, 'Identificador da unidade obrigatorio'),
  turmaId: z.string().optional(),
  titulo: z.string().min(2, 'Titulo deve ter no minimo 2 caracteres'),
  descricao: z.string().optional(),
  tipoEvento: tipoEventoEnum,
  dataHoraInicio: z.string().min(10, 'Data/Hora de inicio obrigatoria'),
  dataHoraFim: z.string().min(10, 'Data/Hora de fim obrigatoria'),
  ehRecorrente: z.boolean().optional().default(false),
  regraRecorrencia: z.string().optional()
});

export const criarEventoBodySchema = eventoBaseSchema.refine(
  (data) => new Date(data.dataHoraFim) >= new Date(data.dataHoraInicio),
  {
    message: 'Data/Hora de fim deve ser posterior ou igual a data/hora de inicio',
    path: ['dataHoraFim']
  }
);

export const atualizarEventoBodySchema = eventoBaseSchema.partial().refine(
  (data) => {
    if (data.dataHoraInicio && data.dataHoraFim) {
      return new Date(data.dataHoraFim) >= new Date(data.dataHoraInicio);
    }
    return true;
  },
  {
    message: 'Data/Hora de fim deve ser posterior ou igual a data/hora de inicio',
    path: ['dataHoraFim']
  }
);

export const listarEventosQuerySchema = z.object({
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  unidadeId: z.string().optional(),
  turmaId: z.string().optional(),
  tipoEvento: tipoEventoEnum.optional()
});

export const obterEventoParamsSchema = z.object({
  id: z.string().min(1, 'Identificador do evento obrigatorio')
});

export type TipoEvento = z.infer<typeof tipoEventoEnum>;
export type CriarEventoInput = z.infer<typeof criarEventoBodySchema>;
export type AtualizarEventoInput = z.infer<typeof atualizarEventoBodySchema>;
export type ListarEventosQuery = z.infer<typeof listarEventosQuerySchema>;
