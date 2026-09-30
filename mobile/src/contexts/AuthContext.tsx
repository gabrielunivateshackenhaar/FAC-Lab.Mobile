import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { entrar as apiEntrar, obterUsuarioAtual, sair as apiSair } from '../api/auth';
import { definirAoDeslogar } from '../api/client';
import { lerTokens, limparTokens } from '../storage/tokenStorage';
import type { PerfilUsuario } from '../types';

export type StatusAutenticacao = 'CARREGANDO' | 'AUTENTICADO' | 'DESAUTENTICADO';

export interface ContextoAutenticacaoDados {
  usuario: PerfilUsuario | null;
  status: StatusAutenticacao;
  entrar: (email: string, senha: string) => Promise<PerfilUsuario>;
  sair: () => Promise<void>;
  recarregarUsuario: () => Promise<void>;
}

const AuthContext = createContext<ContextoAutenticacaoDados | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [usuario, setUsuario] = useState<PerfilUsuario | null>(null);
  const [status, setStatus] = useState<StatusAutenticacao>('CARREGANDO');

  useEffect(() => {
    let montado = true;

    async function inicializarSessao() {
      try {
        const { token } = await lerTokens();
        if (!token) {
          if (montado) {
            setStatus('DESAUTENTICADO');
          }
          return;
        }

        const dadosUsuario = await obterUsuarioAtual();
        if (montado) {
          setUsuario(dadosUsuario);
          setStatus('AUTENTICADO');
        }
      } catch {
        await limparTokens();
        if (montado) {
          setUsuario(null);
          setStatus('DESAUTENTICADO');
        }
      }
    }

    definirAoDeslogar(() => {
      if (montado) {
        setUsuario(null);
        setStatus('DESAUTENTICADO');
      }
    });

    inicializarSessao();

    return () => {
      montado = false;
      definirAoDeslogar(null);
    };
  }, []);

  async function entrar(email: string, senha: string): Promise<PerfilUsuario> {
    const usuarioLogado = await apiEntrar(email, senha);
    const perfil = await obterUsuarioAtual().catch((): PerfilUsuario => {
      if (usuarioLogado.papel === 'RESPONSAVEL') {
        return {
          id: usuarioLogado.id,
          email: usuarioLogado.email,
          status: usuarioLogado.status,
          papel: 'RESPONSAVEL',
          responsavel_id: '',
          responsavel_nome: '',
          responsavel_telefone: '',
        };
      }
      return {
        id: usuarioLogado.id,
        email: usuarioLogado.email,
        status: usuarioLogado.status,
        papel: usuarioLogado.papel,
      };
    });
    setUsuario(perfil);
    setStatus('AUTENTICADO');
    return perfil;
  }

  async function sair(): Promise<void> {
    try {
      await apiSair();
    } finally {
      setUsuario(null);
      setStatus('DESAUTENTICADO');
    }
  }

  async function recarregarUsuario(): Promise<void> {
    const perfil = await obterUsuarioAtual();
    setUsuario(perfil);
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        status,
        entrar,
        sair,
        recarregarUsuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): ContextoAutenticacaoDados {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return contexto;
}
