import { Router } from 'express';
import { autenticarToken } from '../../middlewares/autenticacao';
import { autorizarPapel } from '../../middlewares/autorizacao';
import { validarRequisicao } from '../../middlewares/validacao';
import { AlunosController } from './alunos.controller';
import {
  atualizarAlunoBodySchema,
  criarAlunoBodySchema,
  desvincularResponsavelParamsSchema,
  listarAlunosQuerySchema,
  obterAlunoParamsSchema,
  vincularResponsavelBodySchema
} from './alunos.schemas';

const alunosRoutes = Router();

alunosRoutes.use(autenticarToken);

alunosRoutes.post(
  '/',
  autorizarPapel('ADMINISTRADOR'),
  validarRequisicao({ body: criarAlunoBodySchema }),
  AlunosController.criar
);

alunosRoutes.get(
  '/',
  autorizarPapel('ADMINISTRADOR', 'COLABORADOR', 'RESPONSAVEL'),
  validarRequisicao({ query: listarAlunosQuerySchema }),
  AlunosController.listar
);

alunosRoutes.get(
  '/:id',
  autorizarPapel('ADMINISTRADOR', 'COLABORADOR', 'RESPONSAVEL'),
  validarRequisicao({ params: obterAlunoParamsSchema }),
  AlunosController.obterPorId
);

alunosRoutes.put(
  '/:id',
  autorizarPapel('ADMINISTRADOR'),
  validarRequisicao({ params: obterAlunoParamsSchema, body: atualizarAlunoBodySchema }),
  AlunosController.atualizar
);

alunosRoutes.delete(
  '/:id',
  autorizarPapel('ADMINISTRADOR'),
  validarRequisicao({ params: obterAlunoParamsSchema }),
  AlunosController.inativar
);

alunosRoutes.post(
  '/:id/responsaveis',
  autorizarPapel('ADMINISTRADOR'),
  validarRequisicao({ params: obterAlunoParamsSchema, body: vincularResponsavelBodySchema }),
  AlunosController.vincularResponsavel
);

alunosRoutes.delete(
  '/:id/responsaveis/:responsavelId',
  autorizarPapel('ADMINISTRADOR'),
  validarRequisicao({ params: desvincularResponsavelParamsSchema }),
  AlunosController.desvincularResponsavel
);

export { alunosRoutes };
