import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { CheckCircleIcon, XCircleIcon } from 'phosphor-react-native';
import Txt from './Txt';
import { color, font, radius, space, status, touch } from '../theme/tokens';

// primary: black fill, the one main action of a screen.
// secondary: sunken fill, for the alternative action.
// danger: same fill as primary (grayscale UI); used only inside a
// confirmation sheet, where the label says what will happen.
// link: plain underlined ink text, for navigation between forms.
export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'link';
  loading?: boolean;
  // Text while it works, like "Pagando..." (SRS v1.2, 4.2).
  busyLabel?: string;
  // For about 1.5 s after the answer: green with a check ("Pagado") or red
  // with a cross ("No se pudo pagar"). See hooks/useAction.ts.
  result?: { tone: 'verde' | 'rojo'; label: string } | null;
  disabled?: boolean;
  icon?: ReactNode;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};
export default function Button({ label, onPress, variant = 'primary', loading, busyLabel, result, disabled, icon, accessibilityHint, style }: ButtonProps) {
  const inactive = disabled || loading || !!result;

  if (variant === 'link') {
    return (
      <Pressable
        onPress={onPress}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityHint={accessibilityHint}
        hitSlop={8}
        style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }, style]}
      >
        <Txt variant="label" style={styles.linkText}>{label}</Txt>
      </Pressable>
    );
  }

  const isPrimary = variant === 'primary' || variant === 'danger' || !!result;
  const isDanger = variant === 'danger';
  // Dark tones of green and red keep white text above 4.5:1.
  const resultStyle = result ? { backgroundColor: status[result.tone].text } : null;
  const ResultIcon = result?.tone === 'rojo' ? XCircleIcon : CheckCircleIcon;
  const text = result ? result.label : loading && busyLabel ? busyLabel : label;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      accessibilityLabel={text}
      accessibilityLiveRegion="polite"
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.base,
        isDanger ? styles.danger : isPrimary ? styles.primary : styles.secondary,
        pressed && (isDanger ? styles.dangerPressed : isPrimary ? styles.primaryPressed : styles.secondaryPressed),
        disabled && !loading && !result && styles.disabled,
        style,
        resultStyle,
      ]}
    >
      {/* While it works, the button stays locked and shows a spinner next to
          its label, so the person knows it is processing and does not tap
          twice (client request after the approval). */}
      <View style={styles.row}>
        {result ? <ResultIcon size={20} color={color.white} weight="fill" /> : loading ? <ActivityIndicator size="small" color={isPrimary ? color.white : color.ink} /> : icon}
        <Txt style={[styles.label, { color: isPrimary ? color.white : color.ink }]}>{text}</Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.control,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  primary: { backgroundColor: color.ink },
  primaryPressed: { backgroundColor: color.inkPressed },
  danger: { backgroundColor: color.ink },
  dangerPressed: { backgroundColor: color.inkPressed },
  secondary: { backgroundColor: color.sunken, borderWidth: 1, borderColor: color.divider },
  secondaryPressed: { backgroundColor: color.sunkenPressed },
  disabled: { opacity: 0.45 },
  label: { fontFamily: font.bodySemi, fontSize: 16, lineHeight: 20, textAlign: 'center', flexShrink: 1 },
  link: { minHeight: touch, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { textDecorationLine: 'underline', textDecorationColor: color.inkSoft },
});
