import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import type { Branch } from '../types/domain';
import type { TxtVariant } from './Txt';
import { Image } from 'expo-image';
import { MagnifyingGlassIcon, StarIcon, XIcon } from 'phosphor-react-native';
import Txt from './Txt';
import { PhotoPlaceholder } from './States';
import { color, font, radius, space, touch } from '../theme/tokens';

// Search box: sunken fill, magnifier inside, clear button once there is text.
type SearchFieldProps = { value: string; onChangeText: (v: string) => void; onSubmit?: (v: string) => void; label?: string; placeholder?: string; autoFocus?: boolean };
export const SearchField = forwardRef<React.ComponentRef<typeof TextInput>, SearchFieldProps>(function SearchField({ value, onChangeText, onSubmit, label = 'Buscar', placeholder, autoFocus }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.search, focused && styles.searchFocused]}>
      <MagnifyingGlassIcon size={22} color={color.ink} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => onSubmit?.(value)}
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={color.inkSoft}
        returnKeyType="search"
        autoCorrect={false}
        autoFocus={autoFocus}
        selectionColor={color.ink}
        cursorColor={color.ink}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.searchInput}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} accessibilityRole="button" accessibilityLabel="Borrar búsqueda" style={styles.clear}>
          <XIcon size={20} color={color.inkSoft} />
        </Pressable>
      ) : null}
    </View>
  );
});

// Branch cover photo, or the sunken placeholder with the expected filename.
export function Cover({ branch, height, style }: { branch: Branch; height: number; style?: StyleProp<ViewStyle> }) {
  if (!branch.cover) {
    return <PhotoPlaceholder filename={branch.coverFile} style={[{ height }, style]} />;
  }
  return (
    <Image
      source={branch.cover}
      style={[{ height, borderRadius: radius.photo }, style as StyleProp<ImageStyle>]}
      contentFit="cover"
      accessibilityLabel={`Foto de ${branch.name}`}
      transition={150}
    />
  );
}

// "4.7 de 212 reseñas" with one star; branches without reviews say so in text.
export function RatingLine({ branch, variant = 'small' }: { branch: Branch; variant?: TxtVariant }) {
  if (!branch.reviewCount) {
    return <Txt variant={variant}>Todavía sin reseñas</Txt>;
  }
  return (
    <View style={styles.rating} accessible accessibilityLabel={`Calificación ${branch.rating} de 5, ${branch.reviewCount} reseñas`}>
      <StarIcon size={16} weight="fill" color={color.ink} />
      <Txt variant={variant} numeric style={{ color: color.ink }}>
        {branch.rating?.toFixed(1)} <Txt variant={variant} numeric>de {branch.reviewCount} reseñas</Txt>
      </Txt>
    </View>
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <View style={styles.stars} accessible accessibilityLabel={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={size} weight={n <= value ? 'fill' : 'regular'} color={n <= value ? color.ink : color.inkSoft} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 52,
    borderRadius: radius.control,
    backgroundColor: color.sunken,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.l,
    gap: space.m,
    borderWidth: 2,
    borderColor: color.divider,
  },
  searchFocused: { borderColor: color.ink, backgroundColor: color.raised },
  searchInput: { flex: 1, minHeight: touch, fontFamily: font.body, fontSize: 16, color: color.ink, outlineStyle: 'none' as ViewStyle['outlineStyle'] }, // web only: no browser focus outline
  clear: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  stars: { flexDirection: 'row', gap: 2 },
});
