import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_PATH: z.string().default('./database/fac_garibaldi.db'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve conter ao menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().min(16, 'REFRESH_TOKEN_SECRET deve conter ao menos 16 caracteres'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  FILES_DIR: z.string().default('./files')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Erro de validacao nas variaveis de ambiente:');
  console.error(parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
