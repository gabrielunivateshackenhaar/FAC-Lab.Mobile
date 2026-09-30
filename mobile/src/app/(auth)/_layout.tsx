import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { CarregadorTela } from '../../components/ui/CarregadorTela';

export default function LayoutAuth() {
  const { status, usuario } = useAuth();

  if (status === 'CARREGANDO') {
    return <CarregadorTela />;
  }

  if (status === 'AUTENTICADO' && usuario) {
    const destino = usuario.papel === 'RESPONSAVEL' ? '/inicio' : '/painel';
    return <Redirect href={destino} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
