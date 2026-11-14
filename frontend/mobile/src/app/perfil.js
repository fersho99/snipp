import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraIcon } from 'phosphor-react-native';
import Screen, { BackButton } from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { ErrorNote, OfflineState, Skeleton } from '../components/States';
import useConnectivity from '../hooks/useConnectivity';
import { client } from '../data/demo';
import { color, space, touch } from '../theme/tokens';

const AVATAR = 88;

// Edit profile: photo, name, phone. Email is the username and is read-only.
// States: ?estado=cargando | error-guardar | sin-conexion
export default function EditProfile() {
  const { estado } = useLocalSearchParams();
  const { online, retry, retrying } = useConnectivity(estado === 'sin-conexion');
  const [loadingProfile, setLoadingProfile] = useState(estado === 'cargando');
  const [saved, setSaved] = useState({ name: client.name, phone: client.phone, photo: client.photo });
  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone);
  const [photo, setPhoto] = useState(client.photo);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(estado === 'error-guardar');
  const [savedAt, setSavedAt] = useState(null);

  // The catalogue's "cargando" state stays on screen; otherwise this would
  // flip once the profile request resolves.
  useEffect(() => {
    if (estado !== 'cargando') setLoadingProfile(false);
  }, [estado]);

  if (!online) return <OfflineState onRetry={retry} retrying={retrying} />;
  if (loadingProfile) return <ProfileSkeleton />;

  const dirty = name !== saved.name || phone !== saved.phone || photo !== saved.photo;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const save = async () => {
    const e = {};
    if (!name.trim()) e.name = 'Escribe tu nombre.';
    if (phone.replace(/\D/g, '').length !== 10) e.phone = 'El teléfono debe tener 10 dígitos, sin el +52.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setSaveError(false);
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
    if (estado === 'error-guardar') {
      setSaveError(true);
      return;
    }
    setSaved({ name, phone, photo });
    const now = new Date();
    const h = now.getHours() % 12 || 12;
    setSavedAt(`${h}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'pm' : 'am'}`);
  };

  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  const points = client.points[0];

  return (
    <Screen footer={<Button label="Guardar cambios" onPress={save} loading={saving} disabled={!dirty} />}>
      <BackButton />

      <View style={styles.header}>
        <Pressable
          onPress={pickPhoto}
          accessibilityRole="button"
          accessibilityLabel={photo ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}
          style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.8 }]}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <Txt variant="title" style={{ fontSize: 30, lineHeight: 34 }}>{initials}</Txt>
          )}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Pressable onPress={pickPhoto} accessibilityRole="button" style={styles.photoAction} hitSlop={4}>
            <CameraIcon size={22} color={color.ink} />
            <Txt variant="label" style={{ textDecorationLine: 'underline' }}>{photo ? 'Cambiar foto' : 'Agregar foto'}</Txt>
          </Pressable>
        </View>
      </View>

      <View style={styles.identity}>
        <Txt variant="title" accessibilityRole="header">{saved.name}</Txt>
        <Txt variant="small" numeric>{points.points} puntos en {points.businessName}</Txt>
      </View>

      <View style={styles.form}>
        <TextField
          label="Nombre completo"
          value={name}
          onChangeText={(v) => { setName(v); setSavedAt(null); setErrors((x) => ({ ...x, name: undefined })); }}
          error={errors.name}
          autoComplete="name"
          autoCapitalize="words"
        />
        <TextField
          label="Teléfono celular"
          prefix="+52"
          value={phone}
          onChangeText={(v) => { setPhone(v); setSavedAt(null); setErrors((x) => ({ ...x, phone: undefined })); }}
          error={errors.phone}
          keyboardType="phone-pad"
          autoComplete="tel-national"
        />
        <View style={styles.readOnly}>
          <Txt variant="label">Correo</Txt>
          <Txt variant="body">{client.email}</Txt>
          <Txt variant="small">Es tu usuario para entrar, por eso no se cambia desde aquí.</Txt>
        </View>

        {saveError ? (
          <ErrorNote title="No se guardaron tus cambios">
            Hubo un problema con el servidor. Tus datos siguen como estaban; intenta de nuevo en un momento.
          </ErrorNote>
        ) : null}
        {savedAt && !dirty ? (
          <Txt variant="small" style={{ color: color.ink }} accessibilityLiveRegion="polite">
            Guardado a las {savedAt}. Tus próximas citas ya muestran estos datos.
          </Txt>
        ) : null}
      </View>

      <Button variant="link" label="Cerrar sesión" onPress={() => router.replace('/entrar')} style={{ marginTop: space.xxl }} />
    </Screen>
  );
}

function ProfileSkeleton() {
  return (
    <Screen>
      <BackButton />
      <View style={styles.header} accessibilityLabel="Cargando tu perfil" accessible>
        <Skeleton width={AVATAR} height={AVATAR} radius={AVATAR / 2} />
        <View style={{ flex: 1, gap: space.s }}>
          <Skeleton width={120} height={20} />
          <Skeleton width="85%" height={14} />
        </View>
      </View>
      <View style={styles.identity}>
        <Skeleton width="75%" height={26} />
        <Skeleton width="55%" height={14} />
        <Skeleton width="70%" height={14} />
      </View>
      <View style={styles.form}>
        {[0, 1].map((i) => (
          <View key={i} style={{ gap: space.s }}>
            <Skeleton width={120} height={14} />
            <Skeleton height={52} radius={10} />
          </View>
        ))}
        <View style={{ gap: space.s }}>
          <Skeleton width={60} height={14} />
          <Skeleton width="75%" height={18} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.l, marginTop: space.m },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: color.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: AVATAR, height: AVATAR },
  photoAction: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: touch, alignSelf: 'flex-start' },
  identity: { marginTop: space.xl, gap: space.xs },
  form: { marginTop: space.xxl, gap: space.xl },
  readOnly: { gap: space.xs },
});
