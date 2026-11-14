import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MinusIcon, PlusIcon, ShoppingBagIcon } from 'phosphor-react-native';
import Txt from './Txt';
import Button from './Button';
import { PhotoPlaceholder } from './States';
import { money } from '../theme/format';
import { color, font, radius, sheetShadow, space, touch } from '../theme/tokens';

export function ProductPhoto({ product, size, style }) {
  const box = size ? { width: size, height: size } : { aspectRatio: 1 };
  if (!product.photo) return <PhotoPlaceholder compact={size && size < 90} filename={product.photoFile} style={[box, style]} />;
  return <Image source={product.photo} style={[box, { borderRadius: radius.photo }, style]} contentFit="cover" accessibilityLabel={`Foto de ${product.name}`} />;
}

// − 2 + with 48 dp targets. `max` is the stock.
export function QtyStepper({ value, onChange, max, min = 1, label }) {
  return (
    <View style={styles.stepper} accessibilityLabel={label}>
      <Pressable
        onPress={() => onChange(value - 1)}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel={min === 0 && value === 1 ? 'Quitar del carrito' : 'Una pieza menos'}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.stepPressed, value <= min && { opacity: 0.4 }]}
      >
        <MinusIcon size={20} color={color.ink} />
      </Pressable>
      <Txt numeric style={styles.stepValue} accessibilityLiveRegion="polite">{value}</Txt>
      <Pressable
        onPress={() => onChange(value + 1)}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel={value >= max ? `No hay más piezas, quedan ${max}` : 'Una pieza más'}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.stepPressed, value >= max && { opacity: 0.4 }]}
      >
        <PlusIcon size={20} color={color.ink} />
      </Pressable>
    </View>
  );
}

// Pinned bar to open the cart from the store or a product.
export function CartBar({ summary }) {
  if (!summary.count) return null;
  return (
    <Pressable onPress={() => router.push('/carrito')} accessibilityRole="button" style={({ pressed }) => [styles.cartBar, pressed && { backgroundColor: color.inkPressed }]}>
      <ShoppingBagIcon size={22} color={color.white} />
      <Txt style={styles.cartBarText}>Ver carrito</Txt>
      <Txt numeric style={[styles.cartBarText, { marginLeft: 'auto' }]}>
        {summary.count} {summary.count === 1 ? 'pieza' : 'piezas'}, {money(summary.subtotal)}
      </Txt>
    </Pressable>
  );
}

// The cart holds products of one branch only.
export function OtherBranchModal({ visible, currentBranch, newBranch, onConfirm, onCancel }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { marginBottom: insets.bottom + space.xl }]} accessibilityViewIsModal>
          <Txt variant="title" accessibilityRole="header">Tu carrito es de otra sucursal</Txt>
          <Txt variant="body" style={{ marginTop: space.m }}>
            Tu carrito tiene productos de {currentBranch?.name}. Para agregar productos de {newBranch?.name} hay que vaciarlo.
          </Txt>
          <Txt variant="small" style={{ marginTop: space.s }}>Cada pedido se paga y se recoge en una sola sucursal.</Txt>
          <View style={{ gap: space.s, marginTop: space.xl }}>
            <Button label="Vaciar y agregar" onPress={onConfirm} />
            <Button variant="secondary" label="Cancelar" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: color.sunken, borderRadius: radius.control },
  stepBtn: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control },
  stepPressed: { backgroundColor: color.sunkenPressed },
  stepValue: { minWidth: 28, textAlign: 'center', fontFamily: font.bodySemi, fontSize: 16, color: color.ink },
  cartBar: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 52, borderRadius: radius.control, backgroundColor: color.ink, paddingHorizontal: space.l },
  cartBarText: { fontFamily: font.bodySemi, fontSize: 16, color: color.white },
  backdrop: { flex: 1, backgroundColor: color.scrim, justifyContent: 'flex-end', paddingHorizontal: space.l },
  dialog: { backgroundColor: color.raised, borderRadius: radius.photo, padding: space.xl, maxWidth: 420, width: '100%', alignSelf: 'center', ...sheetShadow },
});
