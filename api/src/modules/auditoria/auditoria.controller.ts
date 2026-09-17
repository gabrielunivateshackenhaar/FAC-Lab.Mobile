import { Request, Response } from 'express';
import { AuditoriaService } from './auditoria.service';

export class AuditoriaController {
  public static async listar(request: Request, response: Response): Promise<void> {
    const logs = AuditoriaService.listar(request.query as any);
    response.status(200).json(logs);
  }
}
