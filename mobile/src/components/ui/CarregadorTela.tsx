import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CORES, ESPACAMENTO } from '../../theme/tokens';

interface CarregadorTelaProps {
  mensagem?: string;
}

export function CarregadorTela({ mensagem }: CarregadorTelaProps) {
  return (
    <View style={estilos.container}>
      <ActivityIndicator size="large" color={CORES.primaria} />
      {mensagem && <Text style={estilos.texto}>{mensagem}</Text>}
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
  },
  texto: {
    marginTop: ESPACAMENTO.md,
    fontSize: 14,
    color: CORES.textoSecundario,
    textAlign: 'center',
  },
});
