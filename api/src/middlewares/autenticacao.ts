import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../core/errors/AppError';
import { UsuarioAutenticado } from '../core/types/usuario';

export function autenticarToken(request: Request, _response: Response, next: NextFunction): void {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token de autenticacao nao fornecido');
  }

  const token = authorizationHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as UsuarioAutenticado;
    request.usuario = {
      id: payload.id,
      email: payload.email,
      papel: payload.papel
    };
    next();
  } catch {
    throw new UnauthorizedError('Token de autenticacao invalido ou expirado');
  }
}
