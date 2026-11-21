import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Screen, { BackButton } from '../../components/Screen';
import Txt from '../../components/Txt';
import { ErrorScreen, OfflineState } from '../../components/States';
import { AddToCartButton, CartBar, CartLimitSheet, ProductPhoto, QtyStepper } from '../../components/Shop';
import useConnectivity from '../../hooks/useConnectivity';
import { getBranch, branches } from '../../data/catalog';
import { cartSummary, getProduct, pointsEarned, stockStatus, useCarts } from '../../data/shop';
import type { CartSummary } from '../../data/shop';
import { money } from '../../theme/format';
import { color, space, status } from '../../theme/tokens';
import { StatusLine } from '../../components/Appointment';
import CartButton from '../../components/CartButton';

// Product detail: photo, price, stock, description, quantity and add.
// Out of stock: no quantity and no add button. It adds to the cart of this
// branch only (RF-M09); with 3 carts of other branches the limit sheet opens.
export default function ProductDetail() {
  const { id, sucursal, estado } = useLocalSearchParams<{ id?: string; sucursal?: string; estado?: string }>();
  const branch = getBranch(sucursal ?? 'los-compas-centro') ?? branches[0];
  const product = getProduct(branch.id, id ?? '');
  const { online, failure, retry, retrying } = useConnectivity(estado);
  const carts = useCarts();
  const [qty, setQty] = useState(1);
  const [limit, setLimit] = useState(false);

  if (!online) return <OfflineState kind={failure} onRetry={retry} retrying={retrying} />;
  if (!product) {
    return <ErrorScreen kind="no-existe" detail={'La sucursal quitó este producto de su tienda. Revisa los demás productos.'} onRetry={retry} retrying={retrying} />;
  }

  const out = product.stock <= 0;
  const mine = carts.find((c) => c.branchId === branch.id);
  const inCart = mine?.items.find((i) => i.productId === product.id)?.qty ?? 0;
  const maxMore = Math.max(0, product.stock - inCart);
  const summary = mine ? cartSummary(mine) : null;

  const footer = out ? null : (
    <View style={{ gap: space.s }}>
      {summary?.count ? <CartBar summary={summary} /> : null}
      <AddToCartButton
        branch={branch}
        product={product}
        qty={qty}
        variant={summary?.count ? 'secondary' : 'primary'}
        label={maxMore ? 'Agregar al carrito de esta sucursal' : 'Ya tienes todas las piezas disponibles'}
        disabled={!maxMore}
        fail={estado === 'error'}
        onLimit={() => setLimit(true)}
        onAdded={() => setQty(1)}
      />
    </View>
  );

  return (
    <Screen footer={footer}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton />
        <CartButton branchId={branch.id} />
      </View>
      <ProductPhoto product={product} style={[{ marginTop: space.s }, out && { opacity: 0.6 }]} />

      <Txt variant="display" accessibilityRole="header" style={{ marginTop: space.xl }}>{product.name}</Txt>
      {product.size ? <Txt variant="bodySoft">{product.size}</Txt> : null}
      <View style={styles.priceRow}>
        <Txt variant="title" numeric>{money(product.price)}</Txt>
        <Txt variant="small" numeric>Ganas {pointsEarned(product.price)} puntos en {branch.name.replace(' Norte', '')}</Txt>
      </View>

      {out ? (
        <View style={styles.outBlock}>
          <View style={[styles.bar, { backgroundColor: status.rojo.stripe }]} />
          <View style={{ flex: 1, gap: space.xs }}>
            <StatusLine status={stockStatus(product.stock)} />
            <Txt variant="label" style={{ color: color.ink }}>Agotado en {branch.name}</Txt>
            <Txt variant="small" style={{ color: color.ink }}>No se puede agregar al carrito hasta que la sucursal tenga piezas otra vez.</Txt>
          </View>
        </View>
      ) : (
        <View style={styles.qtyRow}>
          <View style={{ flex: 1 }}>
            <Txt variant="label">Cantidad</Txt>
            <StatusLine status={stockStatus(product.stock)} style={{ marginTop: space.xs }} />
            {inCart ? <Txt variant="small" numeric>{inCart} ya en el carrito de esta sucursal</Txt> : null}
          </View>
          <QtyStepper value={Math.min(qty, Math.max(1, maxMore))} onChange={setQty} max={Math.max(1, maxMore)} label="Cantidad" />
        </View>
      )}

      <Txt variant="body" style={{ marginTop: space.xl }}>{product.description}</Txt>
      <Txt variant="label" style={{ marginTop: space.xl }}>Cómo se usa</Txt>
      <Txt variant="body" style={{ marginTop: space.xs }}>{product.howTo}</Txt>

      <Txt variant="small" style={{ marginTop: space.xl }}>
        Se paga en la app y se recoge en {branch.name}, {branch.address}. No hay envío a domicilio.
      </Txt>

      <CartLimitSheet
        visible={limit}
        branch={branch}
        carts={carts.map((c) => cartSummary(c)).filter((c): c is CartSummary => !!c)}
        onCancel={() => setLimit(false)}
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
