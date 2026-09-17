import { Request, Response } from 'express';
import { MatriculasService } from './matriculas.service';

export class MatriculasController {
  public static async solicitar(request: Request, response: Response): Promise<void> {
    const usuario = request.usuario!;
    const matricula = MatriculasService.solicitar(request.body, usuario, request.ip);
    response.status(201).json(matricula);
  }

  public static async listar(request: Request, response: Response): Promise<void> {
    const usuario = request.usuario!;
    const matriculas = MatriculasService.listar(request.query as any, usuario);
    response.status(200).json(matriculas);
  }

  public static async obterPorId(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const usuario = request.usuario!;
    const matricula = MatriculasService.obterPorId(id, usuario);
    response.status(200).json(matricula);
  }

  public static async homologar(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const usuarioId = request.usuario?.id as string;
    const matricula = MatriculasService.homologar(id, request.body, usuarioId, request.ip);
    response.status(200).json(matricula);
  }

  public static async confirmarContribuicao(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const { contribuicaoPaga } = request.body;
    const usuarioId = request.usuario?.id as string;
    const matricula = MatriculasService.confirmarContribuicao(id, contribuicaoPaga, usuarioId, request.ip);
    response.status(200).json(matricula);
  }

  public static async cancelar(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const usuario = request.usuario!;
    MatriculasService.cancelar(id, usuario, request.ip);
    response.status(204).send();
  }
}
