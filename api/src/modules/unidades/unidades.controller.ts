import { Request, Response } from 'express';
import { UnidadesService } from './unidades.service';

export class UnidadesController {
  public static async listar(_request: Request, response: Response): Promise<void> {
    const unidades = UnidadesService.listar();
    response.status(200).json(unidades);
  }

  public static async obterPorId(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const unidade = UnidadesService.obterPorId(id);
    response.status(200).json(unidade);
  }
}
