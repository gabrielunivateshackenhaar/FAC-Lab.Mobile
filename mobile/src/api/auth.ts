import { requisicao } from './client';
import { salvarTokens, limparTokens, lerTokens } from '../auth/armazenamento';
import type { RespostaLogin } from './tipos';

export async function entrar(email: string, senha: string) {
  const resposta = await requisicao<RespostaLogin>('/auth/login', {
    metodo: 'POST',
    corpo: { email, senha },
    publica: true,
  });
  await salvarTokens(resposta.token, resposta.refreshToken);
  return resposta.usuario;
}

export async function sair() {
  const { refreshToken } = await lerTokens();
  await requisicao<void>('/auth/logout', {
    metodo: 'POST',
    corpo: { refreshToken },
    publica: true,
  }).catch(() => undefined);
  await limparTokens();
}