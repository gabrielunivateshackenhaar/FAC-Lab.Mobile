import { Request, Response } from 'express';
import { BadRequestError } from '../../core/errors/AppError';
import { DocumentosService } from './documentos.service';

export class DocumentosController {
  public static async upload(request: Request, response: Response): Promise<void> {
    const matriculaId = request.params.matriculaId as string;
    const { tipoDocumento } = request.body;

    if (!request.file) {
      throw new BadRequestError('Nenhum arquivo enviado no campo "arquivo"');
    }

    const usuario = request.usuario!;
    const documento = DocumentosService.salvar(
      matriculaId,
      request.file,
      tipoDocumento,
      usuario,
      request.ip
    );

    response.status(201).json(documento);
  }

  public static async download(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const usuario = request.usuario!;
    const { documento, caminhoAbsoluto } = DocumentosService.obterPorId(id, usuario, request.ip);

    response.setHeader('Content-Type', documento.tipo_mime);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(documento.nome_arquivo)}"`
    );
    response.sendFile(caminhoAbsoluto);
  }

  public static async excluir(request: Request, response: Response): Promise<void> {
    const id = request.params.id as string;
    const usuario = request.usuario!;
    DocumentosService.excluir(id, usuario, request.ip);
    response.status(204).send();
  }

  public static async listarPorMatricula(request: Request, response: Response): Promise<void> {
    const matriculaId = request.params.matriculaId as string;
    const usuario = request.usuario!;
    const documentos = DocumentosService.listarPorMatricula(matriculaId, usuario);
    response.status(200).json(documentos);
  }
}
