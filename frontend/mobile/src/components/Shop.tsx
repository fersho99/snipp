import { Modal, Pressable, StyleSheet, View } from 'react-native';
import type { ImageStyle, StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import type { Branch, Product, StatusText } from '../types/domain';
import { MAX_CARTS, cart, cartSummary, getCart, openCarts } from '../data/shop';
import type { CartExpiry, CartSummary } from '../data/shop';
import { toast } from '../data/toast';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MinusIcon, PlusIcon, ShoppingBagIcon } from 'phosphor-react-native';
import Txt from './Txt';
import Button from './Button';
import { PhotoPlaceholder } from './States';
import { StatusLine, StatusNotice } from './Appointment';
import { money } from '../theme/format';
import { color, font, radius, sheetShadow, space, status, touch } from '../theme/tokens';

export function ProductPhoto({ product, size, style }: { product: Product; size?: number; style?: StyleProp<ViewStyle> }) {
  const box = size ? { width: size, height: size } : { aspectRatio: 1 };
  if (!product.photo) return <PhotoPlaceholder compact={!!size && size < 90} filename={product.photoFile} style={[box, style]} />;
  return <Image source={product.photo} style={[box, { borderRadius: radius.photo }, style as StyleProp<ImageStyle>]} contentFit="cover" accessibilityLabel={`Foto de ${product.name}`} />;
}

// − 2 + with 48 dp targets. `max` is the stock.
export function QtyStepper({ value, onChange, max, min = 1, label }: { value: number; onChange: (v: number) => void; max: number; min?: number; label: string }) {
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

// Expiry label of a cart: gray clock with the days left, amber when it
// empties in 1 day or less (SRS v1.2, 4.2).
export const expiryStatus = (e: CartExpiry): StatusText => ({ label: e.label, color: e.soon ? 'ambar' : 'gris', icon: 'reloj' });

export const piecesLabel = (n: number) => `${n} ${n === 1 ? 'producto' : 'productos'}`;

// Adds to this branch's cart. When it is added, a notice says which cart,
// its products and total, and how many carts are open (SRS v1.2, 4.2).
export function addToBranchCart(branch: Branch, product: Product, qty = 1) {
  const result = cart.add(branch.id, product.id, qty);
  const summary = result === 'added' ? cartSummary(getCart(branch.id)!) : null;
  if (summary) {
    toast(`Agregado al carrito de ${branch.name}`, {
      detail: [`${piecesLabel(summary.count)}, ${money(summary.total)}`, `Tienes ${openCarts().length} de ${MAX_CARTS} carritos`],
      action: { label: 'Ver carrito', to: { pathname: '/carrito', params: { sucursal: branch.id } } },
    });
  }
  return result;
}

// Pinned bar to open this branch's cart from the store or a product.
export function CartBar({ summary }: { summary: CartSummary | null }) {
  if (!summary?.count) return null;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/carrito', params: { sucursal: summary.branch.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.cartBar, pressed && { backgroundColor: color.inkPressed }]}
    >
      <ShoppingBagIcon size={22} color={color.white} />
      <Txt style={styles.cartBarText}>Ver carrito</Txt>
      <Txt numeric style={[styles.cartBarText, { marginLeft: 'auto' }]}>
        {piecesLabel(summary.count)}, {money(summary.subtotal)}
      </Txt>
    </Pressable>
  );
}

// Sheet from the bottom, for confirmations and the cart limit.
function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { marginBottom: insets.bottom + space.xl }]} accessibilityViewIsModal>{children}</View>
      </View>
    </Modal>
  );
}

// Actions that cannot be undone ask first (SRS v1.2, 4.2), like "Vaciar carrito".
export function ConfirmSheet({ visible, title, body, confirmLabel, onConfirm, onCancel }: { visible: boolean; title: string; body: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Sheet visible={visible} onClose={onCancel}>
      <Txt variant="title" accessibilityRole="header">{title}</Txt>
      <Txt variant="body" style={{ marginTop: space.m }}>{body}</Txt>
      <View style={{ gap: space.s, marginTop: space.xl }}>
        <Button variant="danger" label={confirmLabel} onPress={onConfirm} />
        <Button variant="secondary" label="Cancelar" onPress={onCancel} />
      </View>
    </Sheet>
  );
}

// RF-M09, RN-06: with 3 carts open, a product of a fourth branch is not
// added. The sheet lists the 3 carts so the client can pay or empty one.
export function CartLimitSheet({ visible, branch, carts, onCancel }: { visible: boolean; branch: Branch; carts: CartSummary[]; onCancel: () => void }) {
  return (
    <Sheet visible={visible} onClose={onCancel}>
      <StatusNotice tone="ambar" icon="atencion">
        <Txt variant="label" accessibilityRole="header" style={{ color: status.ambar.text }}>Ya tienes {carts.length} carritos abiertos</Txt>
        <Txt variant="small" style={{ color: color.ink }}>
          Para agregar productos de {branch.name} primero paga o vacía uno de tus carritos.
        </Txt>
      </StatusNotice>
      <View style={{ marginTop: space.l }}>
        {carts.map((c, i) => (
          <View key={c.branch.id} style={[styles.limitRow, i > 0 && styles.limitDivider]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="body" style={{ fontFamily: font.bodySemi }}>{c.branch.name}</Txt>
              <Txt variant="small" numeric>{piecesLabel(c.count)}, {money(c.total)}</Txt>
            </View>
            <StatusLine status={expiryStatus(c.expiry)} />
          </View>
        ))}
      </View>
      <View style={{ gap: space.s, marginTop: space.xl }}>
        <Button label="Ir a Carritos" onPress={() => { onCancel(); router.push('/carrito'); }} />
        <Button variant="secondary" label="Cancelar" onPress={onCancel} />
      </View>
    </Sheet>
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
  limitRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m },
  limitDivider: { borderTopWidth: 1, borderTopColor: color.divider },
  dialog: { backgroundColor: color.raised, borderRadius: radius.photo, padding: space.xl, maxWidth: 420, width: '100%', alignSelf: 'center', ...sheetShadow },
});
