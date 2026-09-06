import { NextFunction, Request, Response } from 'express';
import { getDatabase } from '../../config/database';
import { NotFoundError } from '../../core/errors/AppError';
import { AuthService } from './auth.service';

export class AuthController {
  public static login(request: Request, response: Response, next: NextFunction): void {
    try {
      const resultado = AuthService.login(request.body, request.ip);
      response.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  public static refresh(request: Request, response: Response, next: NextFunction): void {
    try {
      const resultado = AuthService.renovarToken(request.body.refreshToken, request.ip);
      response.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  public static registroResponsavel(request: Request, response: Response, next: NextFunction): void {
    try {
      const resultado = AuthService.registrarResponsavel(request.body, request.ip);
      response.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  public static me(request: Request, response: Response, next: NextFunction): void {
    try {
      const usuarioId = request.usuario?.id;
      const db = getDatabase();

      const usuario = db
        .prepare(
          `SELECT u.id, u.email, u.papel, u.status, u.criado_em,
                  r.id as responsavel_id, r.nome as responsavel_nome, r.telefone as responsavel_telefone
           FROM usuarios u
           LEFT JOIN responsaveis r ON r.usuario_id = u.id
           WHERE u.id = ?`
        )
        .get(usuarioId) as Record<string, unknown> | undefined;

      if (!usuario) {
        throw new NotFoundError('Usuario nao encontrado');
      }

      response.status(200).json(usuario);
    } catch (error) {
      next(error);
    }
  }

  public static logout(request: Request, response: Response, next: NextFunction): void {
    try {
      if (request.body.refreshToken) {
        AuthService.logout(request.body.refreshToken);
      }
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
