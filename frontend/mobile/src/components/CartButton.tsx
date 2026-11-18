import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ShoppingBagIcon } from 'phosphor-react-native';
import Txt from './Txt';
import { cartSummary, useCart } from '../data/shop';
import { color, font, touch } from '../theme/tokens';

// Cart icon with the number of pieces, in the header of the branch, the
// store and the product (client request after the approval). Always
// visible, so the client can open the cart from anywhere they shop.
export default function CartButton() {
  const count = cartSummary(useCart(), false).count;
  return (
    <Pressable
      onPress={() => router.push('/carrito')}
      accessibilityRole="button"
      accessibilityLabel={count ? `Carrito, ${count} ${count === 1 ? 'pieza' : 'piezas'}` : 'Carrito vacío'}
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
