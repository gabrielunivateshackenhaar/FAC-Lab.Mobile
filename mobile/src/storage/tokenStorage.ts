import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CHAVE_TOKEN = 'fac_token';
const CHAVE_REFRESH_TOKEN = 'fac_refresh_token';

const ehWeb = Platform.OS === 'web';

async function ler(chave: string): Promise<string | null> {
  return ehWeb ? localStorage.getItem(chave) : SecureStore.getItemAsync(chave);
}

async function gravar(chave: string, valor: string): Promise<void> {
  if (ehWeb) {
    localStorage.setItem(chave, valor);
    return;
  }
  await SecureStore.setItemAsync(chave, valor);
}

async function remover(chave: string): Promise<void> {
  if (ehWeb) {
    localStorage.removeItem(chave);
    return;
  }
  await SecureStore.deleteItemAsync(chave);
}

export interface TokensArmazenados {
  token: string | null;
  refreshToken: string | null;
}

export async function lerTokens(): Promise<TokensArmazenados> {
  const [token, refreshToken] = await Promise.all([ler(CHAVE_TOKEN), ler(CHAVE_REFRESH_TOKEN)]);
  return { token, refreshToken };
}

export async function salvarTokens(token: string, refreshToken: string): Promise<void> {
  await Promise.all([gravar(CHAVE_TOKEN, token), gravar(CHAVE_REFRESH_TOKEN, refreshToken)]);
}

export async function limparTokens(): Promise<void> {
  await Promise.all([remover(CHAVE_TOKEN), remover(CHAVE_REFRESH_TOKEN)]);
}
