import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { CORES, ESPACAMENTO, RAIO_BORDA } from '../../theme/tokens';

interface CampoTextoProps extends TextInputProps {
  rotulo?: string;
  erro?: string | null;
  containerEstilo?: StyleProp<ViewStyle>;
}

export function CampoTexto({
  rotulo,
  erro,
  containerEstilo,
  style,
  onFocus,
  onBlur,
  ...propriedadesRestantes
}: CampoTextoProps) {
  const [focado, setFocado] = useState(false);

  return (
    <View style={[estilos.container, containerEstilo]}>
      {rotulo && <Text style={estilos.rotulo}>{rotulo}</Text>}
      <TextInput
        style={[
          estilos.campo,
          focado && estilos.campoFocado,
          Boolean(erro) && estilos.campoComErro,
          style,
        ]}
        placeholderTextColor={CORES.textoSecundario}
        onFocus={(evento) => {
          setFocado(true);
          onFocus?.(evento);
        }}
        onBlur={(evento) => {
          setFocado(false);
          onBlur?.(evento);
        }}
        {...propriedadesRestantes}
      />
      {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    gap: ESPACAMENTO.xs,
  },
  rotulo: {
    fontSize: 14,
    fontWeight: '500',
    color: CORES.texto,
  },
  campo: {
    backgroundColor: CORES.superficie,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: RAIO_BORDA.md,
    padding: ESPACAMENTO.md,
    fontSize: 16,
    color: CORES.texto,
    minHeight: 48,
  },
  campoFocado: {
    borderColor: CORES.bordaFoco,
  },
  campoComErro: {
    borderColor: CORES.erro,
  },
  erro: {
    fontSize: 12,
    color: CORES.erro,
  },
});
