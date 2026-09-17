import { Router } from 'express';
import { autenticarToken } from '../../middlewares/autenticacao';
import { autorizarPapel } from '../../middlewares/autorizacao';
import { validarRequisicao } from '../../middlewares/validacao';
import { PresencasController } from './presencas.controller';
import {
  obterFrequenciaAlunoParamsSchema,
  obterPresencasEventoParamsSchema,
  registrarPresencasLoteBodySchema
} from './presencas.schemas';

const presencasRoutes = Router();

presencasRoutes.use(autenticarToken);

presencasRoutes.post(
  '/evento/:eventoId',
  autorizarPapel('ADMINISTRADOR', 'COLABORADOR'),
  validarRequisicao({
    params: obterPresencasEventoParamsSchema,
    body: registrarPresencasLoteBodySchema
  }),
  PresencasController.registrarLote
);

presencasRoutes.get(
  '/evento/:eventoId',
  autorizarPapel('ADMINISTRADOR', 'COLABORADOR'),
  validarRequisicao({ params: obterPresencasEventoParamsSchema }),
  PresencasController.listarPorEvento
);

presencasRoutes.get(
  '/aluno/:alunoId',
  autorizarPapel('ADMINISTRADOR', 'COLABORADOR', 'RESPONSAVEL'),
  validarRequisicao({ params: obterFrequenciaAlunoParamsSchema }),
  PresencasController.obterFrequenciaAluno
);

export { presencasRoutes };
