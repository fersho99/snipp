import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack, router, useRootNavigationState, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold } from '@expo-google-fonts/onest';
import { color } from '../theme/tokens';
import { Toaster } from '../components/Done';
import { useSessionAccount } from '../data/session';

// Screens that open without a session (RF-M01). "index" sends to Inicio,
// which asks for a session; the screen index ("pantallas") only exists in
// development, and in production it goes to Entrar.
const PUBLIC = new Set(['index', 'pantallas', 'entrar', 'registro', 'recuperar', 'recuperar-enviado', '+not-found', '_sitemap']);
// Screens that make no sense with a session open.
const SIGNED_OUT_ONLY = new Set(['entrar', 'registro']);

export default function RootLayout() {
  const [loaded] = useFonts({
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
  });

  // Without a session every other screen goes to Entrar; with one, Entrar
  // and Registro go to Inicio (RNF-G03: the session lasts 8 hours).
  const account = useSessionAccount();
  const route = useSegments()[0] ?? 'index';
  const navigationReady = !!useRootNavigationState()?.key;
  const mustSignIn = !account && !PUBLIC.has(route);
  const alreadyIn = !!account && SIGNED_OUT_ONLY.has(route);
  useEffect(() => {
    if (!navigationReady) return;
    if (mustSignIn) router.replace('/entrar');
    else if (alreadyIn) router.replace('/inicio');
  }, [navigationReady, mustSignIn, alreadyIn]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: color.paper }} />;

  const stack = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.paper },
        animation: 'slide_from_right',
      }}
    />
  );
  // Covers the screen while it is redirected, so a protected screen never shows.
  const cover = mustSignIn || alreadyIn ? <View style={[StyleSheet.absoluteFill, { backgroundColor: color.paper }]} /> : null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {Platform.OS === 'web' ? (
        // On web, preview the app inside a 390 px phone-width column.
        <View style={styles.webBackdrop}>
          <View style={styles.webPhone}>
            {stack}
            {cover}
            <Toaster />
          </View>
        </View>
      ) : (
        <>
          {stack}
          {cover}
          <Toaster />
        </>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webBackdrop: { flex: 1, backgroundColor: color.sunken, alignItems: 'center' },
  webPhone: { flex: 1, width: '100%', maxWidth: 390, backgroundColor: color.paper, overflow: 'hidden' },
});
