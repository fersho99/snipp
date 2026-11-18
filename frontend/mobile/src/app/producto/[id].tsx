import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Screen, { BackButton } from '../../components/Screen';
import Txt from '../../components/Txt';
import Button from '../../components/Button';
import { ErrorNote, OfflineState } from '../../components/States';
import { CartBar, OtherBranchModal, ProductPhoto, QtyStepper } from '../../components/Shop';
import useConnectivity from '../../hooks/useConnectivity';
import { getBranch, branches } from '../../data/catalog';
import { cart, cartSummary, getProduct, pointsEarned, useCart } from '../../data/shop';
import { money } from '../../theme/format';
import { color, space } from '../../theme/tokens';

// Product detail: photo, price, stock, description, quantity and add.
// Out of stock: no quantity and no add button.
export default function ProductDetail() {
  const { id, sucursal, estado } = useLocalSearchParams<{ id?: string; sucursal?: string; estado?: string }>();
  const branch = getBranch(sucursal ?? 'los-compas-centro') ?? branches[0];
  const product = getProduct(branch.id, id ?? '');
  const { online, retry, retrying } = useConnectivity(estado === 'sin-conexion');
  const c = useCart();
  const [qty, setQty] = useState(1);
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState<number | null>(null);

  if (!online) return <OfflineState onRetry={retry} retrying={retrying} />;
  if (!product) {
    return (
      <Screen>
        <BackButton />
        <ErrorNote title="Este producto ya no está en la tienda">La sucursal lo quitó del catálogo. Revisa los demás productos.</ErrorNote>
      </Screen>
    );
  }

  const out = product.stock <= 0;
  const inCart = c.branchId === branch.id ? c.items.find((i) => i.productId === product.id)?.qty ?? 0 : 0;
  const maxMore = Math.max(0, product.stock - inCart);
  const summary = cartSummary(c, false);

  const add = () => {
    const r = cart.add(branch.id, product.id, qty);
    if (r === 'other-branch') setPending(true);
    else { setAdded(qty); setQty(1); }
  };

  const footer = out ? null : (
    <View style={{ gap: space.s }}>
      {c.branchId === branch.id && summary.count ? <CartBar summary={summary} /> : null}
      <Button
        variant={c.branchId === branch.id && summary.count ? 'secondary' : 'primary'}
        label={maxMore ? `Agregar ${qty} al carrito, ${money(product.price * qty)}` : 'Ya tienes todas las piezas disponibles'}
        disabled={!maxMore}
        onPress={add}
      />
    </View>
  );

  return (
    <Screen footer={footer}>
      <BackButton />
      <ProductPhoto product={product} style={[{ marginTop: space.s }, out && { opacity: 0.6 }]} />

      <Txt variant="display" accessibilityRole="header" style={{ marginTop: space.xl }}>{product.name}</Txt>
      {product.size ? <Txt variant="bodySoft">{product.size}</Txt> : null}
      <View style={styles.priceRow}>
        <Txt variant="title" numeric>{money(product.price)}</Txt>
        <Txt variant="small" numeric>Ganas {pointsEarned(product.price)} puntos en {branch.name.replace(' Norte', '')}</Txt>
      </View>

      {out ? (
        <View style={styles.outBlock}>
          <View style={[styles.bar, { backgroundColor: color.ink }]} />
          <View style={{ flex: 1 }}>
            <Txt variant="label" style={{ color: color.ink }}>Agotado en {branch.name}</Txt>
            <Txt variant="small" style={{ color: color.ink }}>No se puede agregar al carrito hasta que la sucursal tenga piezas otra vez.</Txt>
          </View>
        </View>
      ) : (
        <View style={styles.qtyRow}>
          <View style={{ flex: 1 }}>
            <Txt variant="label">Cantidad</Txt>
            <Txt variant="small" numeric>
              {product.stock <= 6 ? `Solo quedan ${product.stock}` : `${product.stock} piezas disponibles`}
              {inCart ? `, ${inCart} ya en tu carrito` : ''}
            </Txt>
          </View>
          <QtyStepper value={Math.min(qty, Math.max(1, maxMore))} onChange={setQty} max={Math.max(1, maxMore)} label="Cantidad" />
        </View>
      )}

      {added ? (
        <Txt variant="small" style={{ color: color.ink, marginTop: space.m }} accessibilityLiveRegion="polite">
          Agregaste {added} {added === 1 ? 'pieza' : 'piezas'} al carrito.
        </Txt>
      ) : null}

      <Txt variant="body" style={{ marginTop: space.xl }}>{product.description}</Txt>
      <Txt variant="label" style={{ marginTop: space.xl }}>Cómo se usa</Txt>
      <Txt variant="body" style={{ marginTop: space.xs }}>{product.howTo}</Txt>

      <Txt variant="small" style={{ marginTop: space.xl }}>
        Se paga en la app y se recoge en {branch.name}, {branch.address}. No hay envío a domicilio.
      </Txt>

      <OtherBranchModal
        visible={pending}
        currentBranch={c.branchId ? getBranch(c.branchId) : null}
        newBranch={branch}
        onCancel={() => setPending(false)}
        onConfirm={() => { cart.replaceWith(branch.id, product.id, qty); setPending(false); setAdded(qty); setQty(1); }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.s, marginTop: space.m },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: space.l, marginTop: space.xl },
  outBlock: { flexDirection: 'row', gap: space.m, marginTop: space.xl },
  bar: { width: 3, borderRadius: 2 },
});
