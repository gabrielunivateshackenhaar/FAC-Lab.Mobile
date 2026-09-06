export type PapelUsuario = 'ADMINISTRADOR' | 'COLABORADOR' | 'RESPONSAVEL';
export type StatusUsuario = 'ATIVO' | 'INATIVO' | 'PENDENTE_APROVACAO';

export interface UsuarioAutenticado {
  id: string;
  email: string;
  papel: PapelUsuario;
}
