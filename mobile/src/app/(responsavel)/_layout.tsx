import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { CarregadorTela } from '../../components/ui/CarregadorTela';

export default function LayoutResponsavel() {
  const { status, usuario } = useAuth();

  if (status === 'CARREGANDO') {
    return <CarregadorTela />;
  }

  if (status === 'DESAUTENTICADO' || !usuario) {
    return <Redirect href="/login" />;
  }

  if (usuario.papel !== 'RESPONSAVEL') {
    return <Redirect href="/painel" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
