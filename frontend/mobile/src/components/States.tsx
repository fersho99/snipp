import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WarningCircleIcon, WifiSlashIcon } from 'phosphor-react-native';
import Txt from './Txt';
import Button from './Button';
import { color, radius, space } from '../theme/tokens';

// Full-screen "no internet" state. The app has no offline mode, so every
// screen that needs the network falls back to this with a retry.
export function OfflineState({ onRetry, retrying, detail }: { onRetry: () => void; retrying?: boolean; detail?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.offline, { paddingTop: insets.top + space.huge, paddingBottom: insets.bottom + space.xl }]}>
      <WifiSlashIcon size={24} color={color.ink} />
      <Txt variant="title" style={{ marginTop: space.l }} accessibilityRole="header">
        No hay conexión a internet
      </Txt>
      <Txt variant="bodySoft" style={{ marginTop: space.s }}>
        {detail ?? 'SNIPP necesita internet para revisar tu cuenta y mostrar horarios libres. Revisa tu wifi o tus datos móviles y vuelve a intentar.'}
      </Txt>
      <View style={{ flex: 1 }} />
      <Button label="Reintentar" onPress={onRetry} loading={retrying} />
    </View>
  );
}

// Inline banner for a failed request when the rest of the screen still works.
export function ErrorNote({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.errorNote} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <View style={styles.errorBar} />
      <View style={{ flex: 1, gap: space.xs }}>
        <View style={{ flexDirection: 'row', gap: space.xs, alignItems: 'flex-start' }}>
          <WarningCircleIcon size={18} color={color.ink} weight="fill" style={{ marginTop: 1 }} />
          <Txt variant="label" style={{ color: color.ink, fontFamily: 'Onest_600SemiBold', flex: 1 }}>{title}</Txt>
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
  errorNote: { flexDirection: 'row', gap: space.m, paddingVertical: space.xs },
  errorBar: { width: 3, borderRadius: 2, backgroundColor: color.ink },
  placeholder: {
    backgroundColor: color.sunken,
    borderRadius: radius.photo,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.l,
  },
});
