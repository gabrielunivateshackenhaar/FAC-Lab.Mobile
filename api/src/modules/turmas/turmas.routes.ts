import { Router } from 'express';
import { autenticarToken } from '../../middlewares/autenticacao';
import { autorizarPapel } from '../../middlewares/autorizacao';
import { validarRequisicao } from '../../middlewares/validacao';
import { TurmasController } from './turmas.controller';
import {
  alocarAlunoBodySchema,
  alocarAlunosLoteBodySchema,
  atualizarTurmaBodySchema,
  criarTurmaBodySchema,
  desalocarAlunoParamsSchema,
  listarTurmasQuerySchema,
  obterTurmaParamsSchema
} from './turmas.schemas';

const turmasRoutes = Router();

turmasRoutes.use(autenticarToken);

turmasRoutes.post(
  '/',
  autorizarPapel('ADMINISTRADOR'),
  validarRequisicao({ body: criarTurmaBodySchema }),
  TurmasController.criar
);

turmasRoutes.get(
  '/',
  autorizarPapel('ADMINISTRADOR', 'COLABORADOR'),
  validarRequisicao({ query: listarTurmasQuerySchema }),
  TurmasController.listar
);

turmasRoutes.get(
  '/:id',
  autorizarPapel('ADMINISTRADOR', 'COLABORADOR'),
  validarRequisicao({ params: obterTurmaParamsSchema }),
  TurmasController.obterPorId
);

turmasRoutes.put(
  '/:id',
  autorizarPapel('ADMINISTRADOR'),
  validarRequisicao({ params: obterTurmaParamsSchema, body: atualizarTurmaBodySchema }),
  TurmasController.atualizar
);

turmasRoutes.delete(
  '/:id',
  autorizarPapel('ADMINISTRADOR'),
  validarRequisicao({ params: obterTurmaParamsSchema }),
  TurmasController.excluir
);

turmasRoutes.post(
  '/:id/alunos',
  autorizarPapel('ADMINISTRADOR'),
  validarRequisicao({ params: obterTurmaParamsSchema, body: alocarAlunoBodySchema }),
  TurmasController.alocarAluno
);

turmasRoutes.post(
  '/:id/alunos/lote',
  autorizarPapel('ADMINISTRADOR'),
  validarRequisicao({ params: obterTurmaParamsSchema, body: alocarAlunosLoteBodySchema }),
  TurmasController.alocarAlunosLote
);

turmasRoutes.delete(
  '/:id/alunos/:alunoId',
  autorizarPapel('ADMINISTRADOR'),
  validarRequisicao({ params: desalocarAlunoParamsSchema }),
  TurmasController.desalocarAluno
);

turmasRoutes.get(
  '/:id/alunos',
  autorizarPapel('ADMINISTRADOR', 'COLABORADOR'),
  validarRequisicao({ params: obterTurmaParamsSchema }),
  TurmasController.listarAlunos
);

export { turmasRoutes };
