import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircleIcon, XCircleIcon, XIcon } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import Txt from './Txt';
import { useToast, dismissToast } from '../data/toast';
import { color, font, radius, space, status } from '../theme/tokens';

// Green confirmation that stays on the screen after an action (client
// request after the approval, 17/11/2026): soft green fill, green bar and
// icon, text in ink so it stays easy to read.
export function DoneNote({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <View style={[styles.note, style]} accessibilityLiveRegion="polite" accessibilityRole="text">
      <View style={styles.bar} />
      <CheckCircleIcon size={20} color={status.verde.text} weight="fill" />
      <Txt variant="body" style={{ flex: 1 }}>{children}</Txt>
    </View>
  );
}

// Notice at the top of the screen (data/toast.ts), so it never covers the
// button whose answer it goes with. White with a green stripe and check when
// an action went well, or a red stripe and cross with the cause when it
// failed. It can carry detail lines and one action, like "Ver carrito" or
// "Reintentar".
export function Toaster() {
  const t = useToast();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (t) Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [t, opacity]);
  if (!t) return null;
  return (
    <Animated.View pointerEvents="box-none" style={[styles.toastWrap, { top: insets.top + space.s, opacity }]}>
      <View style={styles.toast} accessibilityLiveRegion={t.tone === 'rojo' ? 'assertive' : 'polite'} accessibilityRole="alert">
        <View style={[styles.toastStripe, { backgroundColor: status[t.tone].stripe }]} />
        {t.tone === 'rojo' ? <XCircleIcon size={20} color={status.rojo.text} weight="fill" /> : <CheckCircleIcon size={20} color={status.verde.text} weight="fill" />}
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="label" style={{ color: color.ink }}>{t.text}</Txt>
          {t.detail?.map((line) => <Txt key={line} variant="small" numeric>{line}</Txt>)}
        </View>
        {t.action ? (
          <Pressable
            onPress={() => { const a = t.action; dismissToast(); if (a?.to) router.push(a.to); a?.onPress?.(); }}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Txt variant="label" style={{ color: color.ink, fontFamily: font.bodySemi, textDecorationLine: 'underline' }}>{t.action.label}</Txt>
          </Pressable>
        ) : null}
        {/* The red notice stays until it is closed (SRS v1.2, 4.2). */}
        {t.tone === 'rojo' ? (
          <Pressable onPress={dismissToast} accessibilityRole="button" accessibilityLabel="Cerrar aviso" hitSlop={10} style={styles.close}>
            <XIcon size={18} color={color.inkSoft} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', gap: space.m, paddingVertical: space.m, paddingRight: space.l, backgroundColor: status.verde.soft, borderRadius: radius.control },
  bar: { width: 3, borderRadius: 2, backgroundColor: status.verde.stripe },
  toastStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  close: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginRight: -space.xs },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.xl },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    width: '100%',
    maxWidth: 420,
    backgroundColor: color.raised,
    borderRadius: radius.control,
    paddingVertical: space.m,
    paddingLeft: space.l + 5,
    paddingRight: space.l,
    overflow: 'hidden',
    shadowColor: '#141414',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
