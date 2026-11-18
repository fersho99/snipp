import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircleIcon } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import Txt from './Txt';
import { useToast, dismissToast } from '../data/toast';
import { color, font, radius, space } from '../theme/tokens';

// Green confirmation that stays on the screen after an action (client
// request after the approval, 17/11/2026): soft green fill, green bar and
// icon, text in ink so it stays easy to read.
export function DoneNote({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <View style={[styles.note, style]} accessibilityLiveRegion="polite" accessibilityRole="text">
      <View style={styles.bar} />
      <CheckCircleIcon size={20} color={color.success} weight="fill" />
      <Txt variant="body" style={{ flex: 1 }}>{children}</Txt>
    </View>
  );
}

// Brief green message at the bottom (data/toast.ts), above the tab bar and
// the cart bar. It can carry one action, like "Ver carrito".
export function Toaster() {
  const t = useToast();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (t) Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [t, opacity]);
  if (!t) return null;
  return (
    <Animated.View pointerEvents="box-none" style={[styles.toastWrap, { bottom: insets.bottom + 96, opacity }]}>
      <View style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <CheckCircleIcon size={20} color={color.white} weight="fill" />
        <Txt variant="label" style={{ color: color.white, flex: 1 }}>{t.text}</Txt>
        {t.action ? (
          <Pressable
            onPress={() => { const to = t.action?.to; dismissToast(); if (to) router.push(to); }}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Txt variant="label" style={{ color: color.white, fontFamily: font.bodySemi, textDecorationLine: 'underline' }}>{t.action.label}</Txt>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', gap: space.m, paddingVertical: space.m, paddingRight: space.l, backgroundColor: color.successSoft, borderRadius: radius.control },
  bar: { width: 3, borderRadius: 2, backgroundColor: color.success },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.xl },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    width: '100%',
    maxWidth: 420,
    backgroundColor: color.success,
    borderRadius: radius.control,
    paddingVertical: space.m,
    paddingHorizontal: space.l,
    shadowColor: '#141414',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
