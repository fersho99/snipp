import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen, { BackButton } from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { OfflineState } from '../components/States';
import useConnectivity from '../hooks/useConnectivity';
import { space } from '../theme/tokens';

// Password recovery, step 1: ask for the email.
// We never reveal whether an account exists for that email.
// States: ?estado=sin-conexion | cargando
export default function ForgotPassword() {
  const { estado, correo } = useLocalSearchParams<{ estado?: string; correo?: string }>();
  const { online, failure, retry, retrying } = useConnectivity(estado);
  const [email, setEmail] = useState(correo ?? (estado === 'cargando' ? 'andrea.valenzuela@gmail.com' : ''));
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(estado === 'cargando');

  if (!online) return <OfflineState kind={failure} home="/entrar" onRetry={retry} retrying={retrying} />;

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Ese correo no parece válido. Revisa que tenga @ y dominio.');
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    router.replace({ pathname: '/recuperar-enviado', params: { correo: email.trim() } });
  };

  return (
    <Screen footer={<Button label="Enviar enlace" onPress={submit} loading={loading} />}>
      <BackButton />
      <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>
        Te mandamos un enlace para crear una contraseña nueva
      </Txt>
      <Txt variant="bodySoft" style={{ marginTop: space.s }}>
        Escribe el correo con el que te registraste. Tus citas, pedidos y puntos se quedan igual.
      </Txt>
      <View style={{ marginTop: space.xxl }}>
        <TextField
          label="Correo"
          value={email}
          onChangeText={(v) => { setEmail(v); setError(undefined); }}
          error={error}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={submit}
          autoFocus={!correo}
        />
      </View>
    </Screen>
  );
}
