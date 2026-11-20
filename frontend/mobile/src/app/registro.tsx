import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen, { BackButton } from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { OfflineState } from '../components/States';
import useConnectivity from '../hooks/useConnectivity';
import { client } from '../data/demo';
import { space } from '../theme/tokens';

type InputRef = React.ComponentRef<typeof TextInput>;
type Field = 'name' | 'email' | 'phone' | 'password';

// Sign up: name, email, phone, password.
// States: ?estado=correo-registrado | sin-conexion | cargando
export default function SignUp() {
  const { estado } = useLocalSearchParams<{ estado?: string }>();
  const { online, failure, retry, retrying } = useConnectivity(estado);
  const prefilled = estado === 'correo-registrado' || estado === 'cargando';

  const [form, setForm] = useState({
    name: prefilled ? client.name : '',
    email: prefilled ? client.email : '',
    phone: prefilled ? client.phone : '',
    password: prefilled ? 'compas2025' : '',
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>(estado === 'correo-registrado' ? { email: 'taken' } : {});
  const [loading, setLoading] = useState(estado === 'cargando');
  const refs = { email: useRef<InputRef>(null), phone: useRef<InputRef>(null), password: useRef<InputRef>(null) };

  if (!online) return <OfflineState kind={failure} home="/entrar" onRetry={retry} retrying={retrying} detail="Sin internet no podemos crear tu cuenta. Lo que escribiste se queda aquí; vuelve a intentar cuando tengas señal." />;

  const set = (key: Field) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<Field, string>> = {};
    if (!form.name.trim()) e.name = 'Escribe tu nombre.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Ese correo no parece válido. Revisa que tenga @ y dominio.';
    if (form.phone.replace(/\D/g, '').length !== 10) e.phone = 'El teléfono debe tener 10 dígitos, sin el +52.';
    if (form.password.length < 8) e.password = 'Usa mínimo 8 caracteres.';
    return e;
  };

  const submit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    if (form.email.trim().toLowerCase() === client.email) {
      setErrors({ email: 'taken' });
      return;
    }
    router.replace('/inicio');
  };

  const emailTaken = errors.email === 'taken';

  return (
    <Screen footer={<Button label="Crear cuenta" onPress={submit} loading={loading} />}>
      <BackButton />
      <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>
        Con tu cuenta reservas, compras y juntas puntos en cada negocio
      </Txt>
      <Txt variant="bodySoft" style={{ marginTop: space.s }}>
        Pedimos tu teléfono para que la sucursal pueda avisarte si cambia tu cita.
      </Txt>

      <View style={styles.form}>
        <TextField
          label="Nombre completo"
          value={form.name}
          onChangeText={set('name')}
          error={errors.name}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => refs.email.current?.focus()}
        />

        <View style={{ gap: space.xs }}>
          <TextField
            ref={refs.email}
            label="Correo"
            value={form.email}
            onChangeText={set('email')}
            error={emailTaken ? `${form.email.trim()} ya tiene una cuenta en SNIPP.` : errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => refs.phone.current?.focus()}
          />
          {emailTaken ? (
            <View style={styles.takenActions}>
              <Button variant="link" label="Entrar con este correo" onPress={() => router.replace('/entrar')} />
              <Button variant="link" label="Recuperar contraseña" onPress={() => router.push({ pathname: '/recuperar', params: { correo: form.email.trim() } })} />
            </View>
          ) : null}
        </View>

        <TextField
          ref={refs.phone}
          label="Teléfono celular"
          prefix="+52"
          value={form.phone}
          onChangeText={set('phone')}
          error={errors.phone}
          hint="10 dígitos."
          keyboardType="phone-pad"
          autoComplete="tel-national"
          textContentType="telephoneNumber"
          returnKeyType="next"
          onSubmitEditing={() => refs.password.current?.focus()}
        />

        <TextField
          ref={refs.password}
          label="Contraseña"
          value={form.password}
          onChangeText={set('password')}
          error={errors.password}
          hint="Mínimo 8 caracteres."
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={submit}
        />

        <View style={styles.signin}>
          <Txt variant="bodySoft">¿Ya tienes cuenta?</Txt>
          <Button variant="link" label="Entrar" onPress={() => router.replace('/entrar')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: space.xxl, gap: space.xl },
  takenActions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.xl },
  inlineLink: { textDecorationLine: 'underline', color: '#1F1B16' },
  signin: { flexDirection: 'row', alignItems: 'center', gap: space.s, flexWrap: 'wrap' },
});
