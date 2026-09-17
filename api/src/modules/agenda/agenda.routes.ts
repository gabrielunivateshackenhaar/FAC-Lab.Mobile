import { Router } from 'express';
import { autenticarToken } from '../../middlewares/autenticacao';
import { autorizarPapel } from '../../middlewares/autorizacao';
import { validarRequisicao } from '../../middlewares/validacao';
import { AgendaController } from './agenda.controller';
import {
  atualizarEventoBodySchema,
  criarEventoBodySchema,
  listarEventosQuerySchema,
  obterEventoParamsSchema
} from './agenda.schemas';

const agendaRoutes = Router();

agendaRoutes.use(autenticarToken);

agendaRoutes.post(
  '/eventos',
  autorizarPapel('ADMINISTRADOR', 'COLABORADOR'),
  validarRequisicao({ body: criarEventoBodySchema }),
  AgendaController.criar
);

agendaRoutes.get(
  '/eventos',
  autorizarPapel('ADMINISTRADOR', 'COLABORADOR', 'RESPONSAVEL'),
  validarRequisicao({ query: listarEventosQuerySchema }),
  AgendaController.listar
);

agendaRoutes.get(
  '/eventos/:id',
  autorizarPapel('ADMINISTRADOR', 'COLABORADOR', 'RESPONSAVEL'),
  validarRequisicao({ params: obterEventoParamsSchema }),
  AgendaController.obterPorId
);

agendaRoutes.put(
  '/eventos/:id',
  autorizarPapel('ADMINISTRADOR', 'COLABORADOR'),
  validarRequisicao({ params: obterEventoParamsSchema, body: atualizarEventoBodySchema }),
  AgendaController.atualizar
);

agendaRoutes.delete(
  '/eventos/:id',
  autorizarPapel('ADMINISTRADOR'),
  validarRequisicao({ params: obterEventoParamsSchema }),
  AgendaController.excluir
);

export { agendaRoutes };
