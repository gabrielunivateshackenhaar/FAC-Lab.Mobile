import { requisicao } from './client';
import { salvarTokens, limparTokens, lerTokens } from '../storage/tokenStorage';
import type { PerfilUsuario, RespostaLogin, Usuario } from '../types';

export async function entrar(email: string, senha: string): Promise<Usuario> {
  const resposta = await requisicao<RespostaLogin>('/auth/login', {
    metodo: 'POST',
    corpo: { email, senha },
    publica: true,
  });
  await salvarTokens(resposta.token, resposta.refreshToken);
  return resposta.usuario;
}

export async function obterUsuarioAtual(): Promise<PerfilUsuario> {
  return requisicao<PerfilUsuario>('/auth/me');
}

export async function sair(): Promise<void> {
  const { refreshToken } = await lerTokens();
  if (refreshToken) {
    await requisicao<void>('/auth/logout', {
      metodo: 'POST',
      corpo: { refreshToken },
      publica: true,
    }).catch(() => undefined);
  }
  await limparTokens();
}