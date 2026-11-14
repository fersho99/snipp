import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Txt from './Txt';
import { color, font, radius, space, touch } from '../theme/tokens';

// primary: terracota fill, the one main action of a screen.
// secondary: sunken fill, for the alternative action.
// danger: same fill as primary (grayscale UI); used only inside a
// confirmation sheet, where the label says what will happen.
// link: plain underlined ink text, for navigation between forms.
export default function Button({ label, onPress, variant = 'primary', loading, disabled, icon, accessibilityHint, style }) {
  const inactive = disabled || loading;

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

  const isPrimary = variant === 'primary' || variant === 'danger';
  const isDanger = variant === 'danger';
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.base,
        isDanger ? styles.danger : isPrimary ? styles.primary : styles.secondary,
        pressed && (isDanger ? styles.dangerPressed : isPrimary ? styles.primaryPressed : styles.secondaryPressed),
        disabled && !loading && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? color.white : color.ink} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Txt style={[styles.label, { color: isPrimary ? color.white : color.ink }]}>{label}</Txt>
        </View>
      )}
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
  secondary: { backgroundColor: color.sunken },
  secondaryPressed: { backgroundColor: color.sunkenPressed },
  disabled: { opacity: 0.45 },
  label: { fontFamily: font.bodySemi, fontSize: 16, lineHeight: 20, textAlign: 'center', flexShrink: 1 },
  link: { minHeight: touch, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { textDecorationLine: 'underline', textDecorationColor: color.inkSoft },
});
