import { Request, Response } from 'express';
import { PresencasService } from './presencas.service';

export class PresencasController {
  public static async registrarLote(request: Request, response: Response): Promise<void> {
    const eventoId = request.params.eventoId as string;
    const { presencas } = request.body;
    const usuarioId = request.usuario?.id as string;

    PresencasService.registrarLote(eventoId, presencas, usuarioId, request.ip);
    response.status(200).json({ mensagem: 'Presencas registradas com sucesso' });
  }

  public static async listarPorEvento(request: Request, response: Response): Promise<void> {
    const eventoId = request.params.eventoId as string;
    const presencas = PresencasService.listarPorEvento(eventoId);
    response.status(200).json(presencas);
  }

  public static async obterFrequenciaAluno(request: Request, response: Response): Promise<void> {
    const alunoId = request.params.alunoId as string;
    const usuario = request.usuario!;
    const relatorio = PresencasService.obterFrequenciaAluno(alunoId, usuario);
    response.status(200).json(relatorio);
  }
}
