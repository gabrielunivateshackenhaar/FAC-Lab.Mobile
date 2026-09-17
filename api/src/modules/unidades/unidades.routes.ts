import { Router } from 'express';
import { autenticarToken } from '../../middlewares/autenticacao';
import { validarRequisicao } from '../../middlewares/validacao';
import { UnidadesController } from './unidades.controller';
import { obterUnidadeParamsSchema } from './unidades.schemas';

const unidadesRoutes = Router();

unidadesRoutes.use(autenticarToken);

unidadesRoutes.get('/', UnidadesController.listar);
unidadesRoutes.get(
  '/:id',
  validarRequisicao({ params: obterUnidadeParamsSchema }),
  UnidadesController.obterPorId
);

export { unidadesRoutes };
