import { Request, Response } from 'express';
import { AgendaService } from './agenda.service';

export class AgendaController {
  public static async criar(request: Request, response: Response): Promise<void> {
    const usuarioId = request.usuario?.id as string;
    const evento = AgendaService.criar(request.body, usuarioId, request.ip);
    response.status(201).json(evento);
  }

  public static async listar(request: Request, response: Response): Promise<void> {
    const eventos = AgendaService.listar(request.query as any);
    response.status(200).json(eventos);
  }

  public static async obterPorId(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const evento = AgendaService.obterPorId(id);
    response.status(200).json(evento);
  }

  public static async atualizar(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const usuarioId = request.usuario?.id as string;
    const evento = AgendaService.atualizar(id, request.body, usuarioId, request.ip);
    response.status(200).json(evento);
  }

  public static async excluir(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const usuarioId = request.usuario?.id as string;
    AgendaService.excluir(id, usuarioId, request.ip);
    response.status(204).send();
  }
}
