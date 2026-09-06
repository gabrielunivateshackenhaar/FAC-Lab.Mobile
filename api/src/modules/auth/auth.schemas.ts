import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email em formato invalido'),
  senha: z.string().min(6, 'A senha deve conter ao menos 6 caracteres')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token e obrigatorio')
});

export const registroResponsavelSchema = z.object({
  nome: z.string().min(3, 'Nome deve conter ao menos 3 caracteres'),
  email: z.string().email('Email em formato invalido'),
  senha: z.string().min(6, 'A senha deve conter ao menos 6 caracteres'),
  cpf: z
    .string()
    .regex(/^\d{11}$/, 'CPF deve conter exatamente 11 digitos numericos')
    .optional(),
  rg: z.string().optional(),
  parentesco: z.string().min(2, 'Parentesco e obrigatorio (ex: Mae, Pai, Avo, Tutor)'),
  telefone: z.string().min(8, 'Telefone deve conter ao menos 8 digitos'),
  localTrabalho: z.string().optional(),
  telefoneTrabalho: z.string().optional()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type RegistroResponsavelInput = z.infer<typeof registroResponsavelSchema>;
