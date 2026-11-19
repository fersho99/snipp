import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen, { BackButton } from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import { ErrorNote, OfflineState, Skeleton } from '../components/States';
import { StatusCard, StatusLine } from '../components/Appointment';
import useConnectivity from '../hooks/useConnectivity';
import { branchOf } from '../data/catalog';
import { orderStatusOf, useOrders } from '../data/shop';
import { money } from '../theme/format';
import { color, font, space, touch } from '../theme/tokens';
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
  const [tab, setTab] = useState<'recoger' | 'anteriores'>('recoger');

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
              <View style={styles.tabs} accessibilityRole="tablist">
                {([
                  ['recoger', 'Por recoger', pending.length],
                  ['anteriores', 'Anteriores', past.length],
                ] as const).map(([id, label, count]) => {
                  const active = tab === id;
                  return (
                    <Pressable key={id} onPress={() => setTab(id)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={styles.tab}>
                      <Txt style={[styles.tabText, active && styles.tabTextActive]}>
                        {label} <Txt numeric style={[styles.tabText, active && { color: color.ink }]}>{count}</Txt>
                      </Txt>
                      <View style={[styles.tabBar, active && { backgroundColor: color.ink }]} />
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.group}>
                {(tab === 'recoger' ? pending : past).map((o) => <OrderRow key={o.folio} order={o} />)}
                {!(tab === 'recoger' ? pending : past).length ? (
                  <Txt variant="bodySoft">{tab === 'recoger' ? 'No tienes pedidos por recoger.' : 'Aún no tienes pedidos anteriores.'}</Txt>
                ) : null}
              </View>
            </>
          )}
        </>
      )}
    </Screen>
  );
}

// SRS v1.2, 4.2.1: folio, total, branch, number of products and the label,
// on a white card with the stripe of its status color.
function OrderRow({ order }: { order: Order }) {
  const branch = branchOf(order.branchId);
  const status = orderStatusOf(order);
  const pieces = order.items.reduce((sum, i) => sum + i.qty, 0);
  const products = `${pieces} ${pieces === 1 ? 'producto' : 'productos'}`;
  return (
    <Pressable
      onPress={() => router.push(`/pedido/${order.folio}`)}
      accessibilityRole="button"
      accessibilityLabel={`Pedido ${order.folio} en ${branch.name}, ${products}, ${money(order.total)}, ${status.label}`}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <StatusCard tone={status.color} style={styles.row}>
        <View style={styles.rowTop}>
          <Txt variant="body" numeric style={{ fontFamily: font.bodySemi, flex: 1 }}>{order.folio}</Txt>
          <Txt variant="body" numeric style={{ fontFamily: font.bodySemi }}>{money(order.total)}</Txt>
        </View>
        <Txt variant="small" numeric>{branch.name} · {products} · {order.placedOn}</Txt>
        <StatusLine status={status} style={{ marginTop: space.xs }} />
      </StatusCard>
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
  group: { marginTop: space.xl, gap: space.l },
  tabs: { flexDirection: 'row', gap: space.xl, marginTop: space.xl },
  tab: { minHeight: touch, justifyContent: 'flex-end' },
  tabText: { fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 22, color: color.inkSoft, paddingBottom: space.s },
  tabTextActive: { fontFamily: font.bodySemi, color: color.ink },
  tabBar: { height: 3, borderRadius: 2, backgroundColor: 'transparent' },
  row: { gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: space.m },
});
