import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { CORES, ESPACAMENTO, RAIO_BORDA } from '../../theme/tokens';

export type VarianteBotao = 'primario' | 'secundario' | 'perigo';

interface BotaoProps {
  titulo: string;
  aoPressionar: () => void;
  variante?: VarianteBotao;
  carregando?: boolean;
  desabilitado?: boolean;
  estilo?: StyleProp<ViewStyle>;
}

export function Botao({
  titulo,
  aoPressionar,
  variante = 'primario',
  carregando = false,
  desabilitado = false,
  estilo,
}: BotaoProps) {
  const inativo = desabilitado || carregando;

  const obterEstiloFundo = () => {
    switch (variante) {
      case 'secundario':
        return estilos.fundoSecundario;
      case 'perigo':
        return estilos.fundoPerigo;
      case 'primario':
      default:
        return estilos.fundoPrimario;
    }
  };

  const obterEstiloTexto = () => {
    switch (variante) {
      case 'secundario':
        return estilos.textoSecundario;
      case 'perigo':
      case 'primario':
      default:
        return estilos.textoBranco;
    }
  };

  const obterCorIndicador = () => {
    return variante === 'secundario' ? CORES.primaria : CORES.textoInverso;
  };

  return (
    <Pressable
      style={[
        estilos.base,
        obterEstiloFundo(),
        inativo && estilos.desabilitado,
        estilo,
      ]}
      onPress={aoPressionar}
      disabled={inativo}
    >
      {carregando ? (
        <ActivityIndicator color={obterCorIndicador()} />
      ) : (
        <Text style={[estilos.textoBase, obterEstiloTexto()]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: ESPACAMENTO.xxl,
    borderRadius: RAIO_BORDA.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fundoPrimario: {
    backgroundColor: CORES.primaria,
  },
  fundoSecundario: {
    backgroundColor: CORES.primariaClara,
  },
  fundoPerigo: {
    backgroundColor: CORES.erro,
  },
  desabilitado: {
    opacity: 0.6,
  },
  textoBase: {
    fontSize: 16,
    fontWeight: '600',
  },
  textoBranco: {
    color: CORES.textoInverso,
  },
  textoSecundario: {
    color: CORES.primaria,
  },
});
