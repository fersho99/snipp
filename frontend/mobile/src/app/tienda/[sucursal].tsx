import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen, { BackButton } from '../../components/Screen';
import Txt from '../../components/Txt';
import Button from '../../components/Button';
import { OfflineState, Skeleton } from '../../components/States';
import { CartBar, OtherBranchModal, ProductPhoto } from '../../components/Shop';
import useConnectivity from '../../hooks/useConnectivity';
import { getBranch, openStatus, branches } from '../../data/catalog';
import { cart, cartSummary, pointsAt, productsFor, useCart, productLabel } from '../../data/shop';
import { money } from '../../theme/format';
import { color, font, space } from '../../theme/tokens';
import type { Product } from '../../types/domain';
import CartButton from '../../components/CartButton';
import { toast } from '../../data/toast';

const LOW_STOCK = 6;

// Branch store: products for pickup only. Out of stock cannot be added.
// States: ?estado=cargando | sin-conexion | otra-sucursal (cart already has
// Los Compas products and you try to add here)
export default function Store() {
  const { sucursal, estado } = useLocalSearchParams<{ sucursal?: string; estado?: string }>();
  const branch = getBranch(sucursal) ?? branches[0];
  const { online, retry, retrying } = useConnectivity(estado === 'sin-conexion');
  const c = useCart();
  const summary = cartSummary(c, false);
  const items = productsFor(branch.id);
  const [pending, setPending] = useState<Product | null>(null); // product waiting for "vaciar y agregar"

  // Demo: cart from another branch, then try to add here.
  useEffect(() => {
    if (estado === 'otra-sucursal') {
      const other = branch.id === 'los-compas-centro' ? 'navaja-fina' : 'los-compas-centro';
      cart.seed(other, [{ productId: 'pomada', qty: 1 }, { productId: 'aceite', qty: 1 }].filter((i) => productsFor(other).some((p) => p.id === i.productId)));
      const first = items.find((p) => p.stock > 0);
      if (first) setPending(first);
    }
  }, [estado]);

  if (!online) return <OfflineState onRetry={retry} retrying={retrying} />;

  const add = (product: Product) => {
    const result = cart.add(branch.id, product.id, 1);
    if (result === 'other-branch') setPending(product);
    else if (result === 'added') toast(`Agregaste ${productLabel(product)} al carrito.`, { label: 'Ver carrito', to: '/carrito' });
  };

  const available = items.filter((p) => p.stock > 0).length;
  const points = pointsAt(branch.businessId);
  const status = openStatus(branch);
  const inCart = (id: string) => (c.branchId === branch.id ? c.items.find((i) => i.productId === id)?.qty ?? 0 : 0);

  return (
    <Screen footer={c.branchId === branch.id && summary.count ? <CartBar summary={summary} /> : null}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton />
        <CartButton />
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
            {items.length} productos en {branch.name}
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
                  {out ? (
                    <Txt variant="small" style={styles.out}>Agotado</Txt>
                  ) : (
                    <>
                      <Button variant="secondary" label="Agregar" onPress={() => add(p)} style={styles.addBtn} />
                      {qty || p.stock <= LOW_STOCK ? (
                        <Txt variant="small" numeric style={{ marginTop: space.xs }}>
                          {qty ? <Txt variant="small" numeric style={{ color: color.ink }}>{qty} en tu carrito</Txt> : null}
                          {qty && p.stock <= LOW_STOCK ? ', ' : ''}
                          {p.stock <= LOW_STOCK ? `quedan ${p.stock}` : ''}
                        </Txt>
                      ) : null}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}

      <OtherBranchModal
        visible={!!pending}
        currentBranch={c.branchId ? getBranch(c.branchId) : null}
        newBranch={branch}
        onCancel={() => setPending(null)}
        onConfirm={() => { if (pending) { cart.replaceWith(branch.id, pending.id, 1); toast(`Agregaste ${productLabel(pending)} al carrito.`, { label: 'Ver carrito', to: '/carrito' }); } setPending(null); }}
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
  out: { color: color.ink, fontFamily: font.bodySemi, marginTop: space.s },
  addBtn: { marginTop: space.s, paddingHorizontal: space.m },
});
