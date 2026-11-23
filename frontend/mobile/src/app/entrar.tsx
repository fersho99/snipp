import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import Screen from '../components/Screen';
import Logo from '../components/Logo';
import Txt from '../components/Txt';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { ErrorNote, OfflineState } from '../components/States';
import useConnectivity from '../hooks/useConnectivity';
import { DEMO_CLIENT } from '../data/demo';
import { signIn } from '../data/session';
import { space } from '../theme/tokens';
import { LIMITS, isEmail } from '@shared/validators';

// Login. Real photo of the shop on the top half, the form below it.
// States: ?estado=credenciales | sin-conexion | cargando
export default function SignIn() {
  const { estado } = useLocalSearchParams<{ estado?: string }>();
  const { height } = useWindowDimensions();
  const { online, failure, retry, retrying } = useConnectivity(estado);

  const [email, setEmail] = useState(estado === 'credenciales' || estado === 'cargando' ? DEMO_CLIENT.email : '');
  const [password, setPassword] = useState(estado === 'credenciales' || estado === 'cargando' ? 'compas2024' : '');
  const [loading, setLoading] = useState(estado === 'cargando');
  const [invalid, setInvalid] = useState(estado === 'credenciales');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  if (!online) return <OfflineState kind={failure} home="/entrar" onRetry={retry} retrying={retrying} />;

  const submit = async () => {
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = 'Escribe tu correo.';
    else if (!isEmail(email)) errors.email = 'Ese correo no parece válido. Revisa que tenga @ y dominio.';
    if (!password) errors.password = 'Escribe tu contraseña.';
    setFieldErrors(errors);
    setInvalid(false);
    if (Object.keys(errors).length) return;

    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/inicio');
    } catch {
      // Wrong email or password: the same message for both (RF-M01).
      setInvalid(true);
    } finally {
      setLoading(false);
    }
  };

  const photoHeight = Math.round(Math.min(Math.max(height * 0.42, 260), 400));

  return (
    <Screen padded={false} topInset={false}>
      <Image
        source={require('../../assets/photos/barberia-interior.jpg')}
        style={{ width: '100%', height: photoHeight }}
        contentFit="cover"
        contentPosition={{ top: '45%', left: '50%' }}
        accessibilityLabel="Interior de una barbería con dos sillones de piel frente al espejo"
        transition={200}
      />

      <View style={styles.body}>
        <Logo size={40} style={styles.wordmark} />
        <Txt variant="display" accessibilityRole="header">Reserva tu corte sin mandar mensajes</Txt>
        <Txt variant="bodySoft" style={{ marginTop: space.s }}>
          Ve los horarios libres de tu barbería o salón y aparta tu lugar en un minuto.
        </Txt>

        <View style={styles.form}>
          <TextField
            label="Correo"
            maxLength={LIMITS.email}
            value={email}
            onChangeText={(v) => { setEmail(v); setInvalid(false); }}
            error={fieldErrors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <View>
            <TextField
              ref={passwordRef}
              label="Contraseña"
              maxLength={LIMITS.password}
              value={password}
              onChangeText={(v) => { setPassword(v); setInvalid(false); }}
              error={fieldErrors.password}
              secure
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <Button variant="link" label="Olvidé mi contraseña" onPress={() => router.push({ pathname: '/recuperar', params: email ? { correo: email } : {} })} />
          </View>

          {invalid ? (
            <ErrorNote title="El correo o la contraseña no coinciden">
              Revisa que sea el correo con el que creaste tu cuenta. Si no recuerdas la contraseña, puedes crear una nueva.
            </ErrorNote>
          ) : null}

          <Button label="Entrar" onPress={submit} loading={loading} />
        </View>

        <View style={styles.signup}>
          <Txt variant="bodySoft">¿Primera vez en SNIPP?</Txt>
          <Button variant="link" label="Crear cuenta" onPress={() => router.push('/registro')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.xl, paddingTop: space.xl },
  wordmark: { marginBottom: space.l },
  form: { marginTop: space.xxl, gap: space.l },
  signup: { marginTop: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.s, flexWrap: 'wrap' },
});
