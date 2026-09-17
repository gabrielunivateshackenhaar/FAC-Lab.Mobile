import { Router } from 'express';
import { autenticarToken } from '../../middlewares/autenticacao';
import { autorizarPapel } from '../../middlewares/autorizacao';
import { validarRequisicao } from '../../middlewares/validacao';
import { MatriculasController } from './matriculas.controller';
import {
  confirmarContribuicaoBodySchema,
  homologarMatriculaBodySchema,
  listarMatriculasQuerySchema,
  obterMatriculaParamsSchema,
  solicitarMatriculaBodySchema
} from './matriculas.schemas';

const matriculasRoutes = Router();

matriculasRoutes.use(autenticarToken);

matriculasRoutes.post(
  '/',
  autorizarPapel('ADMINISTRADOR', 'RESPONSAVEL'),
  validarRequisicao({ body: solicitarMatriculaBodySchema }),
  MatriculasController.solicitar
);

matriculasRoutes.get(
  '/',
  autorizarPapel('ADMINISTRADOR', 'COLABORADOR', 'RESPONSAVEL'),
  validarRequisicao({ query: listarMatriculasQuerySchema }),
  MatriculasController.listar
);

matriculasRoutes.get(
  '/:id',
  autorizarPapel('ADMINISTRADOR', 'COLABORADOR', 'RESPONSAVEL'),
  validarRequisicao({ params: obterMatriculaParamsSchema }),
  MatriculasController.obterPorId
);

matriculasRoutes.patch(
  '/:id/homologar',
  autorizarPapel('ADMINISTRADOR'),
  validarRequisicao({ params: obterMatriculaParamsSchema, body: homologarMatriculaBodySchema }),
  MatriculasController.homologar
);

matriculasRoutes.patch(
  '/:id/contribuicao',
  autorizarPapel('ADMINISTRADOR'),
  validarRequisicao({ params: obterMatriculaParamsSchema, body: confirmarContribuicaoBodySchema }),
  MatriculasController.confirmarContribuicao
);

matriculasRoutes.delete(
  '/:id',
  autorizarPapel('ADMINISTRADOR', 'RESPONSAVEL'),
  validarRequisicao({ params: obterMatriculaParamsSchema }),
  MatriculasController.cancelar
);

export { matriculasRoutes };
