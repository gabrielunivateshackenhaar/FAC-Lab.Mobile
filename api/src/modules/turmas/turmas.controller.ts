import { Request, Response } from 'express';
import { TurmasService } from './turmas.service';

export class TurmasController {
  public static async criar(request: Request, response: Response): Promise<void> {
    const usuarioId = request.usuario?.id as string;
    const turma = TurmasService.criar(request.body, usuarioId, request.ip);
    response.status(201).json(turma);
  }

  public static async listar(request: Request, response: Response): Promise<void> {
    const turmas = TurmasService.listar(request.query as any);
    response.status(200).json(turmas);
  }

  public static async obterPorId(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const turma = TurmasService.obterPorId(id);
    response.status(200).json(turma);
  }

  public static async atualizar(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const usuarioId = request.usuario?.id as string;
    const turma = TurmasService.atualizar(id, request.body, usuarioId, request.ip);
    response.status(200).json(turma);
  }

  public static async excluir(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const usuarioId = request.usuario?.id as string;
    TurmasService.excluir(id, usuarioId, request.ip);
    response.status(204).send();
  }

  public static async alocarAluno(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const { alunoId } = request.body;
    const usuarioId = request.usuario?.id as string;
    TurmasService.alocarAluno(id, alunoId, usuarioId);
    response.status(200).json({ mensagem: 'Aluno enturmado com sucesso' });
  }

  public static async alocarAlunosLote(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const { alunoIds } = request.body;
    const usuarioId = request.usuario?.id as string;
    TurmasService.alocarAlunosLote(id, alunoIds, usuarioId);
    response.status(200).json({ mensagem: 'Alunos enturmados em lote com sucesso' });
  }

  public static async desalocarAluno(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const alunoId = request.params.alunoId as string;
    const usuarioId = request.usuario?.id as string;
    TurmasService.desalocarAluno(id, alunoId, usuarioId);
    response.status(204).send();
  }

  public static async listarAlunos(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const alunos = TurmasService.listarAlunos(id);
    response.status(200).json(alunos);
  }
}
