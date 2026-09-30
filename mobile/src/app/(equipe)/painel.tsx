import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Botao } from '../../components/ui/Botao';
import { CORES, ESPACAMENTO } from '../../theme/tokens';

export default function Painel() {
  const router = useRouter();
  const { usuario, sair } = useAuth();

  async function aoSair() {
    await sair();
    router.replace('/login');
  }

  return (
    <View style={estilos.container}>
      <Text style={estilos.titulo}>Painel da Equipe</Text>
      <Text style={estilos.info}>Usuário: {usuario?.email}</Text>
      <Text style={estilos.papel}>Perfil: {usuario?.papel}</Text>

      <Botao
        titulo="Sair"
        variante="secundario"
        aoPressionar={aoSair}
        estilo={estilos.botaoSair}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CORES.fundo,
    padding: ESPACAMENTO.xxl,
    gap: ESPACAMENTO.md,
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: CORES.texto,
  },
  info: {
    fontSize: 16,
    color: CORES.textoSecundario,
  },
  papel: {
    fontSize: 14,
    color: CORES.primaria,
    fontWeight: '600',
  },
  botaoSair: {
    marginTop: ESPACAMENTO.lg,
    minWidth: 160,
  },
});