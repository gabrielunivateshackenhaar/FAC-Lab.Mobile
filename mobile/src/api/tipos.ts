export type Papel = 'ADMINISTRADOR' | 'COLABORADOR' | 'RESPONSAVEL';

export interface Usuario {
  id: string;
  email: string;
  papel: Papel;
  status: 'ATIVO' | 'INATIVO' | 'PENDENTE_APROVACAO';
}

export interface RespostaLogin {
  token: string;
  refreshToken: string;
  usuario: Usuario;
}

export interface DetalheErro {
  campo: string;
  mensagem: string;
}