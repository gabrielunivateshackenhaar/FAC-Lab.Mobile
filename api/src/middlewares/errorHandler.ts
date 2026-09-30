import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError, ErroDetalhe } from '../core/errors/AppError';

export function errorHandler(
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction
): void {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      codigo: error.codigo,
      mensagem: error.message,
      ...(error.detalhes && { detalhes: error.detalhes })
    });
    return;
  }

  if (error instanceof ZodError) {
    const detalhes: ErroDetalhe[] = error.issues.map((issue) => ({
      campo: issue.path.join('.'),
      mensagem: issue.message
    }));

    response.status(400).json({
      codigo: 'DADOS_INVALIDOS',
      mensagem: 'Dados de entrada invalidos',
      detalhes
    });
    return;
  }

  if (error instanceof multer.MulterError || (error as { name?: string }).name === 'MulterError') {
    const multerError = error as multer.MulterError;
    const isLimitFileSize = multerError.code === 'LIMIT_FILE_SIZE';

    response.status(400).json({
      codigo: 'DADOS_INVALIDOS',
      mensagem: isLimitFileSize
        ? 'Arquivo excede o tamanho maximo permitido de 10MB'
        : (multerError.message || 'Erro no processamento do arquivo'),
      detalhes: [
        {
          campo: multerError.field ?? 'arquivo',
          mensagem: isLimitFileSize
            ? 'Arquivo excede o tamanho maximo permitido de 10MB'
            : multerError.message
        }
      ]
    });
    return;
  }

  console.error('Erro inesperado:', error);

  response.status(500).json({
    codigo: 'ERRO_INTERNO',
    mensagem: 'Ocorreu um erro interno no servidor'
  });
}

