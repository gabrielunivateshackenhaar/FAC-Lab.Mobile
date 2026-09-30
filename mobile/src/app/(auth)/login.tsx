import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { entrar } from '../../api/auth';
import { ErroApi } from '../../api/client';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function aoEntrar() {
    setErro(null);
    setCarregando(true);
    try {
      const usuario = await entrar(email.trim(), senha);
      router.replace(usuario.papel === 'RESPONSAVEL' ? '/inicio' : '/painel');
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível conectar ao servidor');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={estilos.container}>
      <Text style={estilos.titulo}>FAC Garibaldi</Text>

      <TextInput
        style={estilos.campo}
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={estilos.campo}
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      {erro && <Text style={estilos.erro}>{erro}</Text>}

      <Pressable style={estilos.botao} onPress={aoEntrar} disabled={carregando}>
        {carregando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.textoBotao}>Entrar</Text>}
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  titulo: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  campo: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  erro: { color: '#c0392b' },
  botao: { backgroundColor: '#2c6fbb', borderRadius: 8, padding: 14, alignItems: 'center' },
  textoBotao: { color: '#fff', fontSize: 16, fontWeight: '600' },
});