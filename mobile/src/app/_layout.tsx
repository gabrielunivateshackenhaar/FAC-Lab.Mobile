import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';

export default function LayoutRaiz() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}