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
        const parsedQuery = opcoes.query.parse(request.query);
        Object.defineProperty(request, 'query', {
          value: parsedQuery,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
      if (opcoes.params) {
        const parsedParams = opcoes.params.parse(request.params);
        Object.defineProperty(request, 'params', {
          value: parsedParams,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
