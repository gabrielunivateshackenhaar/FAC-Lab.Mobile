import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';

interface ValidacaoOpcoes {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validarRequisicao(opcoes: ValidacaoOpcoes) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    try {
      if (opcoes.body) {
        request.body = opcoes.body.parse(request.body);
      }
      if (opcoes.query) {
        request.query = opcoes.query.parse(request.query) as typeof request.query;
      }
      if (opcoes.params) {
        request.params = opcoes.params.parse(request.params) as typeof request.params;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
