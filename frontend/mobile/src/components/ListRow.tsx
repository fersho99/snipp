import { Pressable, StyleSheet, View } from 'react-native';
import { CaretRightIcon, type IconProps } from 'phosphor-react-native';
import type { ComponentType } from 'react';
import Txt from './Txt';
import { color, font, space } from '../theme/tokens';

// Plain navigation row: title, one line of detail, caret. Rows are separated
// by a hairline, never boxed.
export default function ListRow({ title, detail, onPress, Icon, last }: { title: string; detail?: string; onPress?: () => void; Icon?: ComponentType<IconProps>; last?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && { opacity: 0.6 }]}
    >
      {Icon ? <Icon size={24} color={color.ink} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="body" style={{ fontFamily: font.bodySemi }}>{title}</Txt>
        {detail ? <Txt variant="small">{detail}</Txt> : null}
      </View>
      <CaretRightIcon size={20} color={color.inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.l, minHeight: 72, paddingVertical: space.m },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.divider },
});
