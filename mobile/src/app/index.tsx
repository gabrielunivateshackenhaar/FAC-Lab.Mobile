import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { CarregadorTela } from '../components/ui/CarregadorTela';

export default function Entrada() {
  const { status, usuario } = useAuth();

  if (status === 'CARREGANDO') {
    return <CarregadorTela mensagem="Carregando sessão..." />;
  }

  if (status === 'DESAUTENTICADO' || !usuario) {
    return <Redirect href="/login" />;
  }

  if (usuario.papel === 'RESPONSAVEL') {
    return <Redirect href="/inicio" />;
  }

  return <Redirect href="/painel" />;
}