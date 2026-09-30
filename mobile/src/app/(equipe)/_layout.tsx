import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { CarregadorTela } from '../../components/ui/CarregadorTela';

export default function LayoutEquipe() {
  const { status, usuario } = useAuth();

  if (status === 'CARREGANDO') {
    return <CarregadorTela />;
  }

  if (status === 'DESAUTENTICADO' || !usuario) {
    return <Redirect href="/login" />;
  }

  if (usuario.papel === 'RESPONSAVEL') {
    return <Redirect href="/inicio" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
