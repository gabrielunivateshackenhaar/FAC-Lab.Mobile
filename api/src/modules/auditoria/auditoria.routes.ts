import { Router } from 'express';
import { autenticarToken } from '../../middlewares/autenticacao';
import { autorizarPapel } from '../../middlewares/autorizacao';
import { validarRequisicao } from '../../middlewares/validacao';
import { AuditoriaController } from './auditoria.controller';
import { listarAuditoriaQuerySchema } from './auditoria.schemas';

const auditoriaRoutes = Router();

auditoriaRoutes.use(autenticarToken);
auditoriaRoutes.use(autorizarPapel('ADMINISTRADOR'));

auditoriaRoutes.get(
  '/',
  validarRequisicao({ query: listarAuditoriaQuerySchema }),
  AuditoriaController.listar
);

export { auditoriaRoutes };
