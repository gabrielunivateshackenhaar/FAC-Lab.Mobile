import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase } from '../../config/database';

export const healthRoutes = Router();

healthRoutes.get('/', (_request: Request, response: Response, next: NextFunction): void => {
  try {
    const db = getDatabase();
    const result = db.prepare('SELECT 1 as connected').get() as { connected: number } | undefined;

    response.status(200).json({
      status: 'ok',
      banco: result?.connected === 1 ? 'conectado' : 'desconectado',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});
