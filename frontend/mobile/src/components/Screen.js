import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { color, space, touch } from '../theme/tokens';

// Scrollable, keyboard-aware page on paper. `footer` stays pinned above the
// keyboard / bottom inset (used for the main action of long forms).
// `bottomBar` (the tab bar) sits under the footer, edge to edge.
export default function Screen({ children, footer, bottomBar, padded = true, contentStyle, scroll = true, topInset = true }) {
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? { keyboardShouldPersistTaps: 'handled', contentContainerStyle: [padded && styles.padded, { paddingTop: topInset ? insets.top + space.s : 0, paddingBottom: footer || bottomBar ? space.xl : insets.bottom + space.xxl }, contentStyle] }
    : { style: [{ flex: 1 }, padded && styles.padded, { paddingTop: topInset ? insets.top + space.s : 0 }, contentStyle] };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Body {...bodyProps}>{children}</Body>
      {footer ? <View style={[styles.footer, { paddingBottom: bottomBar ? space.m : insets.bottom + space.l }]}>{footer}</View> : null}
      {bottomBar}
    </KeyboardAvoidingView>
  );
}

export function BackButton({ label = 'Volver', onPress }) {
  return (
    <Pressable
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
    >
      <ArrowLeftIcon size={24} color={color.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper },
  padded: { paddingHorizontal: space.xl },
  footer: { paddingHorizontal: space.xl, paddingTop: space.m, backgroundColor: color.paper },
  back: { width: touch, height: touch, marginLeft: -space.m, alignItems: 'center', justifyContent: 'center' },
});
