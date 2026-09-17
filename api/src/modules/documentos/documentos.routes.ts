import { Router } from 'express';
import { autenticarToken } from '../../middlewares/autenticacao';
import { autorizarPapel } from '../../middlewares/autorizacao';
import { validarRequisicao } from '../../middlewares/validacao';
import { DocumentosController } from './documentos.controller';
import {
  obterDocumentoParamsSchema,
  uploadDocumentoBodySchema,
  uploadDocumentoParamsSchema
} from './documentos.schemas';
import { upload } from './upload.middleware';

const documentosRoutes = Router();

documentosRoutes.use(autenticarToken);

documentosRoutes.post(
  '/matricula/:matriculaId',
  autorizarPapel('ADMINISTRADOR', 'RESPONSAVEL'),
  validarRequisicao({ params: uploadDocumentoParamsSchema }),
  upload.single('arquivo'),
  validarRequisicao({ body: uploadDocumentoBodySchema }),
  DocumentosController.upload
);

documentosRoutes.get(
  '/matricula/:matriculaId',
  autorizarPapel('ADMINISTRADOR', 'COLABORADOR', 'RESPONSAVEL'),
  validarRequisicao({ params: uploadDocumentoParamsSchema }),
  DocumentosController.listarPorMatricula
);

documentosRoutes.get(
  '/:id',
  autorizarPapel('ADMINISTRADOR', 'COLABORADOR', 'RESPONSAVEL'),
  validarRequisicao({ params: obterDocumentoParamsSchema }),
  DocumentosController.download
);

documentosRoutes.delete(
  '/:id',
  autorizarPapel('ADMINISTRADOR', 'RESPONSAVEL'),
  validarRequisicao({ params: obterDocumentoParamsSchema }),
  DocumentosController.excluir
);

export { documentosRoutes };
