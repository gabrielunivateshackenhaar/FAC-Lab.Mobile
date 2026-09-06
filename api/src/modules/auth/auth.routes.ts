import { Router } from 'express';
import { autenticarToken } from '../../middlewares/autenticacao';
import { validarRequisicao } from '../../middlewares/validacao';
import { AuthController } from './auth.controller';
import { loginSchema, refreshTokenSchema, registroResponsavelSchema } from './auth.schemas';

export const authRoutes = Router();

authRoutes.post('/login', validarRequisicao({ body: loginSchema }), AuthController.login);
authRoutes.post('/refresh', validarRequisicao({ body: refreshTokenSchema }), AuthController.refresh);
authRoutes.post(
  '/registro-responsavel',
  validarRequisicao({ body: registroResponsavelSchema }),
  AuthController.registroResponsavel
);
authRoutes.get('/me', autenticarToken, AuthController.me);
authRoutes.post('/logout', AuthController.logout);
