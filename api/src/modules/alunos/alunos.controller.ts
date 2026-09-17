import { Request, Response } from 'express';
import { AlunosService } from './alunos.service';

export class AlunosController {
  public static async criar(request: Request, response: Response): Promise<void> {
    const usuarioId = request.usuario?.id as string;
    const aluno = AlunosService.criar(request.body, usuarioId, request.ip);
    response.status(201).json(aluno);
  }

  public static async listar(request: Request, response: Response): Promise<void> {
    const usuario = request.usuario!;
    const alunos = AlunosService.listar(request.query as any, usuario);
    response.status(200).json(alunos);
  }

  public static async obterPorId(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const usuario = request.usuario!;
    const aluno = AlunosService.obterPorId(id, usuario, request.ip);
    response.status(200).json(aluno);
  }

  public static async atualizar(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const usuarioId = request.usuario?.id as string;
    const aluno = AlunosService.atualizar(id, request.body, usuarioId, request.ip);
    response.status(200).json(aluno);
  }

  public static async inativar(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const usuarioId = request.usuario?.id as string;
    AlunosService.inativar(id, usuarioId, request.ip);
    response.status(204).send();
  }

  public static async vincularResponsavel(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const { responsavelId, contatoPrincipal } = request.body;
    const usuarioId = request.usuario?.id as string;
    AlunosService.vincularResponsavel(id, responsavelId, contatoPrincipal, usuarioId);
    response.status(200).json({ mensagem: 'Responsavel vinculado com sucesso' });
  }

  public static async desvincularResponsavel(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const responsavelId = request.params.responsavelId as string;
    const usuarioId = request.usuario?.id as string;
    AlunosService.desvincularResponsavel(id, responsavelId, usuarioId);
    response.status(204).send();
  }
}
