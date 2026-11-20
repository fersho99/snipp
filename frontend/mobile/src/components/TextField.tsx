import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle, type TextInputProps } from 'react-native';
import type { ReactNode } from 'react';
import { EyeIcon, EyeSlashIcon, WarningCircleIcon } from 'phosphor-react-native';
import Txt from './Txt';
import { color, font, radius, space, touch } from '../theme/tokens';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  hint?: string;
  error?: string | null;
  secure?: boolean;
  prefix?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Labelled input on a sunken fill (no border at rest). Focus adds a 2 px
// gray ring; an error adds a 2 px ink ring plus icon and message below.
const TextField = forwardRef<React.ComponentRef<typeof TextInput>, TextFieldProps>(function TextField(
  { label, hint, error, secure, prefix, editable = true, style, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={[styles.wrap, style]}>
      <Txt variant="label" nativeID={`${label}-label`}>{label}</Txt>
      <View
        style={[
          styles.field,
          !editable && styles.readOnly,
          inputProps.multiline && styles.multiField,
          focused && styles.focused,
          !!error && styles.errored,
        ]}
      >
        {prefix ? <Txt variant="bodySoft" numeric style={styles.prefix}>{prefix}</Txt> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityLabelledBy={`${label}-label`}
          accessibilityHint={error || hint}
          editable={editable}
          secureTextEntry={secure && hidden}
          placeholderTextColor={color.inkSoft}
          selectionColor={color.ink}
          cursorColor={color.ink}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, inputProps.multiline && styles.multiInput]}
          textAlignVertical={inputProps.multiline ? 'top' : undefined}
          {...inputProps}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
            style={styles.eye}
          >
            {hidden ? <EyeIcon size={22} color={color.inkSoft} /> : <EyeSlashIcon size={22} color={color.inkSoft} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <WarningCircleIcon size={18} color={color.ink} weight="regular" style={{ marginTop: 1 }} />
          <Txt variant="small" style={styles.errorText}>{error}</Txt>
        </View>
      ) : hint ? (
        <Txt variant="small">{hint}</Txt>
      ) : null}
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  wrap: { gap: space.s },
  field: {
    minHeight: 52,
    borderRadius: radius.control,
    backgroundColor: color.sunken,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.l,
    borderWidth: 2,
    borderColor: color.divider,
  },
  readOnly: { backgroundColor: 'transparent', borderColor: 'transparent', paddingLeft: 0 },
  multiField: { alignItems: 'stretch' },
  multiInput: { minHeight: 136, paddingTop: 14, paddingBottom: 14, lineHeight: 23 },
  focused: { borderColor: color.inkSoft, backgroundColor: color.raised },
  errored: { borderColor: color.ink },
  prefix: { marginRight: space.s },
  input: {
    flex: 1,
    minHeight: touch,
    paddingRight: space.l,
    fontFamily: font.body,
    fontSize: 16,
    color: color.ink,
    outlineStyle: 'none' as ViewStyle['outlineStyle'], // web only: no browser focus outline
  },
  eye: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  errorRow: { flexDirection: 'row', gap: space.s, alignItems: 'flex-start' },
  errorText: { color: color.ink, fontFamily: 'Onest_500Medium', flex: 1 },
});
