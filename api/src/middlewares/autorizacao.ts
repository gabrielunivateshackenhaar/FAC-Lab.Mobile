import { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../core/errors/AppError';
import { PapelUsuario } from '../core/types/usuario';

export function autorizarPapel(...papeisPermitidos: PapelUsuario[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.usuario) {
      throw new UnauthorizedError('Usuario nao autenticado');
    }

    if (!papeisPermitidos.includes(request.usuario.papel)) {
      throw new ForbiddenError('Permissao insuficiente para realizar esta operacao');
    }

    next();
  };
}
