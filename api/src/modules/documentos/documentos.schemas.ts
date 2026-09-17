import { z } from 'zod';

export const tipoDocumentoEnum = z.enum([
  'DOC_ALUNO',
  'DOC_RESPONSAVEL',
  'COMPROVANTE_RESIDENCIA',
  'COMPROVANTE_RENDA',
  'TERMO_IMAGEM_VOZ',
  'FOTO_3X4',
  'OUTRO'
]);

export const uploadDocumentoBodySchema = z.object({
  tipoDocumento: tipoDocumentoEnum
});

export const obterDocumentoParamsSchema = z.object({
  id: z.string().min(1, 'Identificador do documento obrigatorio')
});

export const uploadDocumentoParamsSchema = z.object({
  matriculaId: z.string().min(1, 'Identificador da matricula obrigatorio')
});

export type TipoDocumento = z.infer<typeof tipoDocumentoEnum>;
