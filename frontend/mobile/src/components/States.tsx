import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExclamationMarkIcon, HourglassIcon, WarningCircleIcon, WifiSlashIcon, XIcon } from 'phosphor-react-native';
import Txt from './Txt';
import Button from './Button';
import { TabBar } from './Appointment';
import { color, radius, space, status, stripeWidth } from '../theme/tokens';

// Error screen (RF-M18, RN-20, SRS v1.2, 4.2 "Pantalla de error"): full
// screen on white, keeping the tab bar on the main sections. Red icon for the
// case, title, a plain explanation and the reference code in gray ("Código
// E-503 · 18/11/2026 01:47"), with no technical details or support contacts:
// the code is how the error is found in the server logs. Black "Reintentar" and the
// "Volver al inicio" link. The screen behind keeps what was typed, so a
// successful retry brings it back as it was.
export type ScreenFailure = 'sin-conexion' | 'servidor' | 'tiempo' | 'no-existe' | 'esperando';

const FAILURE: Record<Exclude<ScreenFailure, 'esperando'>, { Icon: typeof WifiSlashIcon; code: string; title: string; body: string }> = {
  'sin-conexion': { Icon: WifiSlashIcon, code: 'E-000', title: 'No hay conexión', body: 'SNIPP necesita internet. Revisa tu wifi o tus datos móviles y vuelve a intentar.' },
  servidor: { Icon: ExclamationMarkIcon, code: 'E-503', title: 'Algo salió mal', body: 'Tuvimos un problema de nuestro lado y no pudimos cargar esta pantalla. Vuelve a intentar en un momento.' },
  tiempo: { Icon: HourglassIcon, code: 'E-504', title: 'Esto tardó demasiado', body: 'La pantalla no respondió en 15 segundos. Puede ser tu conexión o el servidor; vuelve a intentar.' },
  'no-existe': { Icon: XIcon, code: 'E-404', title: 'Ya no está disponible', body: 'Lo que buscas ya no existe o el enlace está mal escrito.' },
};

export function ErrorScreen({ kind, title, detail, onRetry, retrying, tabs, home = '/inicio' }: {
  kind: ScreenFailure; title?: string; detail?: string; onRetry: () => void; retrying?: boolean; tabs?: boolean; home?: string;
}) {
  const insets = useSafeAreaInsets();
  // When the error happened, on the device clock (not the demo date).
  const [at] = useState(() => new Date());
  const bottom = tabs ? <TabBar /> : null;
  if (kind === 'esperando') {
    return (
      <View style={{ flex: 1, backgroundColor: color.paper }}>
        <View style={[styles.waiting, { paddingTop: insets.top }]} accessible accessibilityLabel="Cargando" accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={color.ink} />
          <Txt variant="bodySoft" style={{ marginTop: space.l }}>Cargando...</Txt>
        </View>
        {bottom}
      </View>
    );
  }
  const f = FAILURE[kind];
  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <View style={[styles.offline, { paddingTop: insets.top + space.xl, paddingBottom: tabs ? space.xl : insets.bottom + space.xl }]}>
        {/* Centered: the red icon on its light red circle, title and explanation. */}
        <View style={styles.errorBody}>
          <View style={styles.errorIcon}>
            <f.Icon size={44} color={status.rojo.stripe} weight={kind === 'servidor' || kind === 'no-existe' ? 'bold' : 'fill'} />
          </View>
          <Txt variant="title" style={styles.errorTitle} accessibilityRole="header">{title ?? f.title}</Txt>
          <Txt variant="bodySoft" style={styles.errorText}>{detail ?? f.body}</Txt>
          <Txt variant="small" numeric style={styles.errorCode}>Código {f.code} · {stamp(at)}</Txt>
        </View>
        <Button label="Reintentar" onPress={onRetry} loading={retrying} busyLabel="Reintentando..." />
        <Button variant="link" label="Volver al inicio" onPress={() => router.replace(home)} style={{ alignSelf: 'center', marginTop: space.m }} />
      </View>
      {bottom}
    </View>
  );
}

const two = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) => `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}`;

// The connection and loading failures every screen can get (see
// hooks/useConnectivity.ts). `detail` explains the "no internet" case for
// that screen ("Tus carritos se quedan como están").
export function OfflineState({ kind = 'sin-conexion', onRetry, retrying, detail, tabs, home }: {
  kind?: ScreenFailure | null; onRetry: () => void; retrying?: boolean; detail?: string; tabs?: boolean; home?: string;
}) {
  const k = kind ?? 'sin-conexion';
  return <ErrorScreen kind={k} detail={k === 'sin-conexion' ? detail : undefined} onRetry={onRetry} retrying={retrying} tabs={tabs} home={home} />;
}

// Inline banner for a failed request when the rest of the screen still works.
export function ErrorNote({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.errorNote} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <View style={styles.errorBar} />
      <View style={{ flex: 1, gap: space.xs }}>
        <View style={{ flexDirection: 'row', gap: space.xs, alignItems: 'flex-start' }}>
          <WarningCircleIcon size={18} color={status.rojo.text} weight="fill" style={{ marginTop: 1 }} />
          <Txt variant="label" style={{ color: status.rojo.text, fontFamily: 'Onest_600SemiBold', flex: 1 }}>{title}</Txt>
        </View>
        {children ? <Txt variant="small" style={{ color: color.ink }}>{children}</Txt> : null}
        {action}
      </View>
    </View>
  );
}

// Pulsing placeholder block; compose several to mirror the real layout.
export function Skeleton({ width = '100%', height = 16, radius: r = 6, style }: { width?: DimensionValue; height?: DimensionValue; radius?: number; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: color.sunken, opacity }, style]} />;
}

// Stand-in for a photo that has not been provided yet: sunken block with the
// expected filename, never a generic illustration.
// `compact` shrinks the label for thumbnails under ~80 px.
export function PhotoPlaceholder({ filename, style, compact }: { filename?: string; style?: StyleProp<ViewStyle>; compact?: boolean }) {
  return (
    <View style={[styles.placeholder, style]}>
      <Txt variant="small" numeric style={[{ textAlign: 'center' }, compact && { fontSize: 11, lineHeight: 14 }]}>{filename}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  offline: { flex: 1, backgroundColor: color.paper, paddingHorizontal: space.xl },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: space.xxl },
  errorIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: status.rojo.soft, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { marginTop: space.xl, textAlign: 'center' },
  errorText: { marginTop: space.s, textAlign: 'center', maxWidth: 320 },
  errorCode: { marginTop: space.m, textAlign: 'center' },
  // SRS v1.2, 4.1: failed action or error in red (light fill, stripe and icon).
  errorNote: { flexDirection: 'row', gap: space.m, padding: space.m, paddingLeft: 0, backgroundColor: status.rojo.soft, borderRadius: radius.control, overflow: 'hidden' },
  errorBar: { width: stripeWidth, alignSelf: 'stretch', marginVertical: -space.m, backgroundColor: status.rojo.stripe },
  placeholder: {
    backgroundColor: color.sunken,
    borderRadius: radius.photo,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.l,
  },
});
