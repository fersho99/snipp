import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen, { BackButton } from '../../components/Screen';
import Txt from '../../components/Txt';
import { OfflineState, Skeleton } from '../../components/States';
import { AddToCartButton, CartBar, CartLimitSheet, ProductPhoto } from '../../components/Shop';
import { StatusLine } from '../../components/Appointment';
import useConnectivity from '../../hooks/useConnectivity';
import { getBranch, openStatus, branches } from '../../data/catalog';
import { cartSummary, pointsAt, productsFor, seedDemoCarts, stockStatus, useCarts } from '../../data/shop';
import { money } from '../../theme/format';
import { color, font, space } from '../../theme/tokens';
import CartButton from '../../components/CartButton';
import type { CartSummary } from '../../data/shop';


// Branch store: products for pickup only. Out of stock cannot be added.
// Each branch has its own cart (RF-M09); with 3 carts open, a product of
// another branch is not added and the limit sheet opens.
// States: ?estado=cargando | sin-conexion | error (adding fails once) | limite (3 carts
// of other branches are open and you try to add here)
export default function Store() {
  const { sucursal, estado } = useLocalSearchParams<{ sucursal?: string; estado?: string }>();
  const branch = getBranch(sucursal) ?? branches[0];
  const { online, retry, retrying } = useConnectivity(estado === 'sin-conexion');
  const carts = useCarts();
  const mine = carts.find((c) => c.branchId === branch.id);
  const summary = mine ? cartSummary(mine) : null;
  const items = productsFor(branch.id);
  const [limit, setLimit] = useState(false);

  // Demo: 3 carts of other branches, then try to add here.
  useEffect(() => {
    if (estado === 'limite') {
      seedDemoCarts('tres');
      setLimit(true);
    }
  }, [estado]);

  if (!online) return <OfflineState onRetry={retry} retrying={retrying} />;

  const available = items.filter((p) => p.stock > 0).length;
  const points = pointsAt(branch.businessId);
  const status = openStatus(branch);
  const inCart = (id: string) => mine?.items.find((i) => i.productId === id)?.qty ?? 0;

  return (
    <Screen footer={summary?.count ? <CartBar summary={summary} /> : null}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton />
        <CartButton branchId={branch.id} />
      </View>
      <Txt variant="small" style={{ marginTop: space.s }}>Recoges en {branch.address}, no hay envío</Txt>

      {estado === 'cargando' ? (
        <StoreSkeleton />
      ) : items.length === 0 ? (
        <View style={{ marginTop: space.s }}>
          <Txt variant="title" accessibilityRole="header">{branch.name} todavía no vende productos en SNIPP</Txt>
          <Txt variant="bodySoft" style={{ marginTop: space.s }}>
            Cuando la sucursal dé de alta productos, aparecerán aquí.
          </Txt>
        </View>
      ) : (
        <>
          <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.s }}>
            {items.length} {items.length === 1 ? 'producto' : 'productos'} en {branch.name}
          </Txt>
          <Txt variant="small" style={{ marginTop: space.xs }}>
            {available} {available === 1 ? 'disponible' : 'disponibles'}. {status.open ? `Puedes recoger hoy ${status.label.replace('Abierto ', '')}` : status.label}.
          </Txt>
          {points ? (
            <Txt variant="body" numeric style={{ marginTop: space.l }}>
              Tienes <Txt style={{ fontFamily: font.bodySemi }}>{points} puntos</Txt> en {branch.name.replace('Barbería ', '').replace(' Norte', '')}: {money(points)} de descuento en estos productos.
            </Txt>
          ) : null}

          <View style={styles.grid}>
            {items.map((p) => {
              const qty = inCart(p.id);
              const out = p.stock <= 0;
              return (
                <View key={p.id} style={styles.card}>
                  <Pressable
                    onPress={() => router.push({ pathname: `/producto/${p.id}`, params: { sucursal: branch.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.name}${p.size ? ` ${p.size}` : ''}, ${money(p.price)}${out ? ', agotado' : ''}`}
                  >
                    <ProductPhoto product={p} style={out && { opacity: 0.6 }} />
                    <Txt variant="body" style={{ fontFamily: font.bodySemi, marginTop: space.s }}>{p.name}</Txt>
                    {p.size ? <Txt variant="small">{p.size}</Txt> : null}
                    <Txt variant="body" numeric style={{ fontFamily: font.bodyMedium, marginTop: space.xs }}>{money(p.price)}</Txt>
                  </Pressable>
                  <StatusLine status={stockStatus(p.stock)} style={{ marginTop: space.s }} />
                  {out ? null : (
                    <>
                      <AddToCartButton branch={branch} product={p} variant="secondary" label="Agregar" fail={estado === 'error'} onLimit={() => setLimit(true)} style={styles.addBtn} />
                      {qty ? (
                        <Txt variant="small" numeric style={{ marginTop: space.xs, color: color.ink }}>{qty} en tu carrito</Txt>
                      ) : null}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}

      <CartLimitSheet
        visible={limit}
        branch={branch}
        carts={carts.map((c) => cartSummary(c)).filter((c): c is CartSummary => !!c)}
        onCancel={() => setLimit(false)}
      />
    </Screen>
  );
}

function StoreSkeleton() {
  return (
    <View accessible accessibilityLabel="Cargando productos">
      <Skeleton width="80%" height={28} style={{ marginTop: space.s }} />
      <Skeleton width="55%" height={14} style={{ marginTop: space.s }} />
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.card, { gap: space.s }]}>
            <Skeleton height={150} radius={16} />
            <Skeleton width="80%" height={16} />
            <Skeleton width="40%" height={14} />
            <Skeleton height={52} radius={10} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.l, rowGap: space.xxl, marginTop: space.xl },
  card: { width: '46%', flexGrow: 1 },
  addBtn: { marginTop: space.s, paddingHorizontal: space.m },
});
