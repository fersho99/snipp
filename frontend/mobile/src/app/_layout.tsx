import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold } from '@expo-google-fonts/onest';
import { color } from '../theme/tokens';
import { Toaster } from '../components/Done';

export default function RootLayout() {
  const [loaded] = useFonts({
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
  });

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

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {Platform.OS === 'web' ? (
        // On web, preview the app inside a 390 px phone-width column.
        <View style={styles.webBackdrop}>
          <View style={styles.webPhone}>
            {stack}
            <Toaster />
          </View>
        </View>
      ) : (
        <>
          {stack}
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
