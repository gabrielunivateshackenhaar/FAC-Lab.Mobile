import { API_URL } from '../config/env';
import { lerTokens, salvarTokens, limparTokens } from '../storage/tokenStorage';
import type { DetalheErro } from '../types';

export class ErroApi extends Error {
  constructor(
    public status: number,
    public codigo: string,
    mensagem: string,
    public detalhes: DetalheErro[] = [],
  ) {
    super(mensagem);
  }
}

interface Opcoes {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  corpo?: unknown;
  publica?: boolean;
}

let renovacaoEmAndamento: Promise<boolean> | null = null;
let callbackAoDeslogar: (() => void) | null = null;

export function definirAoDeslogar(callback: (() => void) | null): void {
  callbackAoDeslogar = callback;
}

function notificarDeslogar(): void {
  if (callbackAoDeslogar) {
    callbackAoDeslogar();
  }
}

function renovarToken(): Promise<boolean> {
  renovacaoEmAndamento ??= (async () => {
    const { refreshToken } = await lerTokens();
    if (!refreshToken) {
      notificarDeslogar();
      return false;
    }

    const resposta = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!resposta.ok) {
      await limparTokens();
      notificarDeslogar();
      return false;
    }

    const dados = await resposta.json();
    await salvarTokens(dados.token, dados.refreshToken);
    return true;
  })().finally(() => {
    renovacaoEmAndamento = null;
  });

  return renovacaoEmAndamento;
}

export async function requisicao<T>(
  caminho: string,
  opcoes: Opcoes = {},
  jaTentouRenovar = false,
): Promise<T> {
  const { metodo = 'GET', corpo, publica = false } = opcoes;
  const cabecalhos: Record<string, string> = {};

  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';

  if (!publica) {
    const { token } = await lerTokens();
    if (token) cabecalhos.Authorization = `Bearer ${token}`;
  }

  const resposta = await fetch(`${API_URL}${caminho}`, {
    method: metodo,
    headers: cabecalhos,
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });

  if (resposta.status === 401 && !publica && !jaTentouRenovar && (await renovarToken())) {
    return requisicao<T>(caminho, opcoes, true);
  }

  if (resposta.status === 204) return undefined as T;

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new ErroApi(
      resposta.status,
      dados?.codigo ?? 'ERRO_DESCONHECIDO',
      dados?.mensagem ?? 'Erro inesperado',
      dados?.detalhes ?? [],
    );
  }

  return dados as T;
}