export type Papel = 'ADMINISTRADOR' | 'COLABORADOR' | 'RESPONSAVEL';

export type StatusConta = 'ATIVO' | 'INATIVO' | 'PENDENTE_APROVACAO';

export interface UsuarioBase {
  id: string;
  email: string;
  status: StatusConta;
  criado_em?: string;
}

export interface PerfilEquipe extends UsuarioBase {
  papel: 'ADMINISTRADOR' | 'COLABORADOR';
}

export interface PerfilResponsavel extends UsuarioBase {
  papel: 'RESPONSAVEL';
  responsavel_id: string;
  responsavel_nome: string;
  responsavel_telefone: string;
}

export type PerfilUsuario = PerfilEquipe | PerfilResponsavel;

export interface Usuario {
  id: string;
  email: string;
  papel: Papel;
  status: StatusConta;
}

export interface RespostaLogin {
  token: string;
  refreshToken: string;
  usuario: Usuario;
}

export interface RequisicaoRegistroResponsavel {
  nome: string;
  email: string;
  senha: string;
  cpf?: string;
  rg?: string;
  parentesco: string;
  telefone: string;
  localTrabalho?: string;
  telefoneTrabalho?: string;
}

export interface RespostaRegistroResponsavel {
  mensagem: string;
  usuarioId: string;
  responsavelId: string;
}
