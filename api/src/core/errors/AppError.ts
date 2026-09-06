export interface ErroDetalhe {
  campo?: string;
  mensagem: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly codigo: string;
  public readonly detalhes?: ErroDetalhe[];

  constructor(mensagem: string, statusCode = 400, codigo = 'ERRO_REQUISICAO', detalhes?: ErroDetalhe[]) {
    super(mensagem);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.codigo = codigo;
    this.detalhes = detalhes;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(mensagem: string, codigo = 'REQUISICAO_INVALIDA', detalhes?: ErroDetalhe[]) {
    super(mensagem, 400, codigo, detalhes);
  }
}

export class UnauthorizedError extends AppError {
  constructor(mensagem = 'Nao autenticado', codigo = 'NAO_AUTENTICADO') {
    super(mensagem, 401, codigo);
  }
}

export class ForbiddenError extends AppError {
  constructor(mensagem = 'Acesso negado para este recurso', codigo = 'ACESSO_NEGADO') {
    super(mensagem, 403, codigo);
  }
}

export class NotFoundError extends AppError {
  constructor(mensagem = 'Recurso nao encontrado', codigo = 'NAO_ENCONTRADO') {
    super(mensagem, 404, codigo);
  }
}

export class ConflictError extends AppError {
  constructor(mensagem = 'Conflito com recurso existente', codigo = 'CONFLITO') {
    super(mensagem, 409, codigo);
  }
}

export class ValidationError extends AppError {
  constructor(detalhes: ErroDetalhe[]) {
    super('Dados de entrada invalidos', 400, 'DADOS_INVALIDOS', detalhes);
  }
}
