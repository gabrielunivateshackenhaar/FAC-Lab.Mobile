import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { ErroApi } from '../../api/client';
import { Botao } from '../../components/ui/Botao';
import { CampoTexto } from '../../components/ui/CampoTexto';
import { CORES, ESPACAMENTO } from '../../theme/tokens';

export default function Login() {
  const router = useRouter();
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function aoEntrar() {
    if (!email.trim() || !senha) {
      setErro('Informe o e-mail e a senha');
      return;
    }

    setErro(null);
    setCarregando(true);

    try {
      const usuario = await entrar(email.trim(), senha);
      router.replace(usuario.papel === 'RESPONSAVEL' ? '/inicio' : '/painel');
    } catch (excecao) {
      if (excecao instanceof ErroApi) {
        setErro(excecao.message);
      } else {
        setErro('Não foi possível conectar ao servidor');
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={estilos.tela}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={estilos.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={estilos.cabecalho}>
          <Text style={estilos.subtitulo}>Fraterno Auxílio Cristão</Text>
          <Text style={estilos.titulo}>FAC Garibaldi</Text>
        </View>

        <View style={estilos.formulario}>
          <CampoTexto
            rotulo="E-mail"
            placeholder="seu.email@exemplo.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={(texto) => {
              setEmail(texto);
              if (erro) setErro(null);
            }}
          />

          <CampoTexto
            rotulo="Senha"
            placeholder="Digite sua senha"
            secureTextEntry
            autoCapitalize="none"
            value={senha}
            onChangeText={(texto) => {
              setSenha(texto);
              if (erro) setErro(null);
            }}
          />

          {erro ? <Text style={estilos.mensagemErro}>{erro}</Text> : null}

          <Botao
            titulo="Entrar"
            aoPressionar={aoEntrar}
            carregando={carregando}
            estilo={estilos.botaoEntrar}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: CORES.fundo,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: ESPACAMENTO.xxl,
  },
  cabecalho: {
    marginBottom: ESPACAMENTO.secao,
    alignItems: 'center',
  },
  subtitulo: {
    fontSize: 14,
    color: CORES.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  titulo: {
    fontSize: 30,
    fontWeight: '700',
    color: CORES.primaria,
    marginTop: ESPACAMENTO.xs,
  },
  formulario: {
    gap: ESPACAMENTO.lg,
  },
  mensagemErro: {
    color: CORES.erro,
    fontSize: 14,
    textAlign: 'center',
  },
  botaoEntrar: {
    marginTop: ESPACAMENTO.sm,
  },
});