import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ShoppingBagIcon } from 'phosphor-react-native';
import Txt from './Txt';
import { useCarts } from '../data/shop';
import { color, font, touch } from '../theme/tokens';

// Carts icon with the number of open carts, in the header of the branch, the
// store and the product. Always visible, so the client can open the carts
// from anywhere they shop; it opens on the cart of `branchId` if there is one.
export default function CartButton({ branchId }: { branchId?: string }) {
  const count = useCarts().length;
  return (
    <Pressable
      onPress={() => router.push(branchId ? { pathname: '/carrito', params: { sucursal: branchId } } : '/carrito')}
      accessibilityRole="button"
      accessibilityLabel={count ? `Carritos, ${count} ${count === 1 ? 'abierto' : 'abiertos'}` : 'Carritos, ninguno abierto'}
      hitSlop={4}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
    >
      <ShoppingBagIcon size={26} color={color.ink} weight={count ? 'fill' : 'regular'} />
      {count ? <CountBadge count={count} /> : null}
    </Pressable>
  );
}

export function CountBadge({ count, style }: { count: number; style?: object }) {
  return (
    <View style={[styles.badge, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Txt numeric style={styles.badgeText}>{count > 99 ? '99+' : count}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { width: touch, height: touch, marginRight: -8, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: color.paper,
  },
  badgeText: { color: color.white, fontFamily: font.bodySemi, fontSize: 11, lineHeight: 14 },
});
