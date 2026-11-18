import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen, { BackButton } from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import { ErrorNote, OfflineState, Skeleton } from '../components/States';
import { StatusLine } from '../components/Appointment';
import useConnectivity from '../hooks/useConnectivity';
import { branchOf } from '../data/catalog';
import { getProduct, orderStatusOf, productLabel, useOrders } from '../data/shop';
import { money } from '../theme/format';
import { font, space } from '../theme/tokens';
import type { Order } from '../types/domain';

// My orders (RF-M11): history and status of each order. The branch changes
// the status on the web and it shows here.
// States: ?estado=sin-pedidos | cargando | error | sin-conexion
export default function MyOrders() {
  const { estado } = useLocalSearchParams<{ estado?: string }>();
  const { online, retry, retrying } = useConnectivity(estado === 'sin-conexion');
  const all = useOrders();
  const [failed, setFailed] = useState(estado === 'error');
  const [reloading, setReloading] = useState(false);

  if (!online) return <OfflineState onRetry={retry} retrying={retrying} />;

  const orders = estado === 'sin-pedidos' ? [] : all;
  const pending = orders.filter((o) => o.status === 'pagado' || o.status === 'listo');
  const past = orders.filter((o) => o.status === 'entregado' || o.status === 'cancelado');
  const ready = pending.filter((o) => o.status === 'listo');

  const reload = async () => {
    setReloading(true);
    await new Promise((r) => setTimeout(r, 800));
    setReloading(false);
    setFailed(false);
  };

  let title = 'Mis pedidos';
  if (!failed && estado !== 'cargando') {
    if (ready.length === 1) title = `Tu pedido ${ready[0].folio} está listo para recoger`;
    else if (ready.length > 1) title = `Tienes ${ready.length} pedidos listos para recoger`;
    else if (!orders.length) title = 'Todavía no has comprado nada';
  }

  return (
    <Screen>
      <BackButton />
      {estado === 'cargando' ? (
        <OrdersSkeleton />
      ) : failed ? (
        <View style={{ marginTop: space.m, gap: space.xl }}>
          <Txt variant="title" accessibilityRole="header">Mis pedidos</Txt>
          <ErrorNote title="No pudimos cargar tus pedidos">Hubo un problema con el servidor. Tus pedidos y pagos siguen igual.</ErrorNote>
          <Button variant="secondary" label="Reintentar" loading={reloading} onPress={reload} />
        </View>
      ) : (
        <>
          <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>{title}</Txt>
          {!orders.length ? (
            <View style={{ marginTop: space.m, gap: space.xl }}>
              <Txt variant="bodySoft">
                Los productos se compran en la tienda de cada sucursal, se pagan con tarjeta y se recogen en esa misma sucursal.
              </Txt>
              <Button variant="secondary" label="Buscar un negocio" onPress={() => router.replace('/inicio')} />
            </View>
          ) : (
            <>
              {pending.length ? (
                <View style={styles.group}>
                  <Txt variant="heading">Por recoger</Txt>
                  {pending.map((o) => <OrderRow key={o.folio} order={o} />)}
                </View>
              ) : null}
              {past.length ? (
                <View style={styles.group}>
                  <Txt variant="heading">Anteriores</Txt>
                  {past.map((o) => <OrderRow key={o.folio} order={o} />)}
                </View>
              ) : null}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function OrderRow({ order }: { order: Order }) {
  const branch = branchOf(order.branchId);
  const status = orderStatusOf(order);
  const items = order.items.map((i) => {
    const p = getProduct(order.branchId, i.productId);
    return `${i.qty} × ${p ? productLabel(p) : i.productId}`;
  }).join(', ');
  return (
    <Pressable
      onPress={() => router.push(`/pedido/${order.folio}`)}
      accessibilityRole="button"
      accessibilityLabel={`Pedido ${order.folio} en ${branch.name}, ${money(order.total)}, ${status.label}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.rowTop}>
        <Txt variant="body" style={{ fontFamily: font.bodySemi, flex: 1 }}>{items}</Txt>
        <Txt variant="body" numeric style={{ fontFamily: font.bodySemi }}>{money(order.total)}</Txt>
      </View>
      <Txt variant="small" numeric>{order.folio}, {branch.name}, {order.placedOn}</Txt>
      <StatusLine status={status} style={{ marginTop: space.xs }} />
    </Pressable>
  );
}

function OrdersSkeleton() {
  return (
    <View style={{ marginTop: space.m, gap: space.s }} accessible accessibilityLabel="Cargando tus pedidos">
      <Skeleton width="80%" height={28} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ gap: space.s, marginTop: space.xl }}>
          <Skeleton width="70%" height={18} />
          <Skeleton width="50%" height={14} />
          <Skeleton width="40%" height={14} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: space.xxl, gap: space.xl },
  row: { gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: space.m },
});
