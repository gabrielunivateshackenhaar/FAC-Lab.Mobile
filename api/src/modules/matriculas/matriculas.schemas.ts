import { z } from 'zod';

export const tipoMatriculaEnum = z.enum(['PRE_INSCRICAO', 'MATRICULA_NOVA', 'REMATRICULA']);
export const statusMatriculaEnum = z.enum([
  'PENDENTE_PRESENCIAL',
  'ENVIADA',
  'APROVADA',
  'REJEITADA',
  'CANCELADA'
]);

export const solicitarMatriculaBodySchema = z.object({
  alunoId: z.string().min(1, 'Identificador do aluno obrigatorio'),
  unidadeId: z.string().min(1, 'Identificador da unidade obrigatorio'),
  anoLetivo: z.number().int().min(2020).max(2050),
  tipo: tipoMatriculaEnum,
  rendaFamiliar: z.number().nonnegative().optional(),
  numeroDependentes: z.number().int().nonnegative().optional()
});

export const homologarMatriculaBodySchema = z
  .object({
    status: z.enum(['APROVADA', 'REJEITADA']),
    motivoRejeicao: z.string().optional()
  })
  .refine(
    (data) => {
      if (data.status === 'REJEITADA') {
        return !!data.motivoRejeicao && data.motivoRejeicao.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Motivo de rejeicao e obrigatorio quando a matricula for rejeitada',
      path: ['motivoRejeicao']
    }
  );

export const confirmarContribuicaoBodySchema = z.object({
  contribuicaoPaga: z.boolean()
});

export const listarMatriculasQuerySchema = z.object({
  status: statusMatriculaEnum.optional(),
  unidadeId: z.string().optional(),
  anoLetivo: z.coerce.number().int().optional(),
  alunoId: z.string().optional(),
  tipo: tipoMatriculaEnum.optional(),
  limite: z.coerce.number().int().positive().optional().default(50),
  pagina: z.coerce.number().int().positive().optional().default(1)
});

export const obterMatriculaParamsSchema = z.object({
  id: z.string().min(1, 'Identificador da matricula obrigatorio')
});

export type TipoMatricula = z.infer<typeof tipoMatriculaEnum>;
export type StatusMatricula = z.infer<typeof statusMatriculaEnum>;
export type SolicitarMatriculaInput = z.infer<typeof solicitarMatriculaBodySchema>;
export type HomologarMatriculaInput = z.infer<typeof homologarMatriculaBodySchema>;
export type ListarMatriculasQuery = z.infer<typeof listarMatriculasQuerySchema>;
