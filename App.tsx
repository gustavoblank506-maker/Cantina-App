import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Fraunces_900Black } from '@expo-google-fonts/fraunces/900Black';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { useLayout } from './src/hooks/useLayout';
import { api, setUnauthorizedHandler } from './src/services/api';
import { styles } from './src/theme';
import type { User } from './src/types';
import { LoginView } from './src/views/LoginView';
import { PanelView } from './src/views/PanelView';
import { StudentView } from './src/views/StudentView';

export default function App() {
  const [fontsLoaded] = useFonts({ Fraunces_900Black, DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold });
  const { wide, fullBleed } = useLayout();
  // undefined: ainda verificando se já existe sessão; null: ninguém logado.
  const [user, setUser] = useState<User | null>();
  const [loginMessage, setLoginMessage] = useState('');

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setLoginMessage('Sua sessão expirou. Entre novamente.');
      setUser(null);
    });
    api.me().then(setUser, () => setUser(null));
  }, []);

  if (!fontsLoaded || user === undefined) return <View style={styles.page} />;

  const login = (next: User) => {
    setLoginMessage('');
    setUser(next);
  };

  const logout = async () => {
    await api.logout().catch(() => {});
    setLoginMessage('');
    setUser(null);
  };

  // A capa ocupa a página inteira em qualquer tamanho de tela, sem moldura (DESIGN.md).
  if (!user) {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.fullPage} keyboardShouldPersistTaps="handled">
        <StatusBar style="light" />
        <LoginView message={loginMessage} onLogin={login} />
      </ScrollView>
    );
  }

  let content;
  if (user.role === 'atendente') content = <PanelView key={user.id} user={user} onLogout={logout} />;
  else content = <StudentView key={user.id} user={user} onLogout={logout} />;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={wide ? styles.shell : [styles.pageContent, fullBleed && styles.pageFullBleed]}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar style="dark" />
      {/* Computador: tela inteira em colunas. Celular e tablet: moldura de celular. */}
      {wide ? content : <View style={[styles.phone, fullBleed && styles.phoneFullBleed]}>{content}</View>}
    </ScrollView>
  );
}
