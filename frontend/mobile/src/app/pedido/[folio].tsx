import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen, { BackButton } from '../../components/Screen';
import Txt from '../../components/Txt';
import Button from '../../components/Button';
import { ErrorNote, OfflineState, Skeleton } from '../../components/States';
import { StatusLine } from '../../components/Appointment';
import useConnectivity from '../../hooks/useConnectivity';
import { openStatus, branchOf } from '../../data/catalog';
import { getProduct, orderStatusOf, pointsEarned, productLabel, useOrders } from '../../data/shop';
import { money } from '../../theme/format';
import { color, font, radius, space } from '../../theme/tokens';

const STEP_LABEL: Record<string, string> = { pagado: 'Pagado', listo: 'Listo para recoger', entregado: 'Entregado', cancelado: 'Cancelado' };

// Order detail (RF-M11): status with its dates, where to pick it up, what was
// paid and the Stripe reference (RN-17). A cancelled order shows the refund (RN-06).
// States: ?estado=cargando | sin-conexion
export default function OrderDetail() {
  const { folio, estado } = useLocalSearchParams<{ folio?: string; estado?: string }>();
  const { online, retry, retrying } = useConnectivity(estado === 'sin-conexion');
  const order = useOrders().find((o) => o.folio === folio);

  if (!online) return <OfflineState onRetry={retry} retrying={retrying} />;
  if (estado === 'cargando') {
    return (
      <Screen>
        <BackButton />
        <View style={{ gap: space.s, marginTop: space.s }} accessible accessibilityLabel="Cargando el pedido">
          <Skeleton width={160} height={14} />
          <Skeleton width="70%" height={32} />
          <Skeleton width="85%" height={18} style={{ marginTop: space.m }} />
          <Skeleton height={96} radius={10} style={{ marginTop: space.xl }} />
          <Skeleton height={120} radius={10} style={{ marginTop: space.xl }} />
        </View>
      </Screen>
    );
  }
  if (!order) {
    return (
      <Screen>
        <BackButton />
        <ErrorNote title={`No encontramos el pedido ${folio}`}>Revisa el folio o búscalo en Mis pedidos.</ErrorNote>
      </Screen>
    );
  }

  const branch = branchOf(order.branchId);
  const status = orderStatusOf(order);
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const cancelled = order.status === 'cancelado';
  const toPickUp = order.status === 'pagado' || order.status === 'listo';
  const steps = cancelled ? ['pagado', 'cancelado'] : ['pagado', 'listo', 'entregado'];
  const when = Object.fromEntries(order.timeline);
  const open = openStatus(branch);

  const lead = {
    pagado: 'Te avisamos con una notificación cuando esté listo para recoger.',
    listo: `Ya puedes recogerlo en ${branch.name}. Muestra el folio ${order.folio} al llegar; si va otra persona por ti, solo necesita el folio.`,
    entregado: `Lo recogiste el ${when.entregado?.split(',')[0]}.`,
    cancelado: null,
  }[order.status];

  return (
    <Screen>
      <BackButton />
      <StatusLine status={status} style={{ marginTop: space.s }} />
      <Txt variant="display" accessibilityRole="header" style={{ marginTop: space.s }}>Pedido {order.folio}</Txt>
      {lead ? <Txt variant="body" style={{ marginTop: space.m }}>{lead}</Txt> : null}

      {cancelled && order.refund ? (
        <View style={{ marginTop: space.xl }}>
          <ErrorNote title={`${branch.name} canceló este pedido`}>
            {order.refund.note ? `“${order.refund.note}” ` : ''}Te reembolsamos {money(order.refund.amount)} por Stripe a la tarjeta con la que pagaste.
          </ErrorNote>
        </View>
      ) : null}

      {toPickUp ? (
        <View style={styles.pickup}>
          <Txt variant="small">Dónde lo recoges</Txt>
          <Txt variant="body" style={{ fontFamily: font.bodySemi }}>{branch.name}</Txt>
          <Txt variant="body">{branch.address}, {branch.neighborhood}</Txt>
          <Txt variant="small" style={{ marginTop: space.s }}>{open.label}</Txt>
        </View>
      ) : null}

      <Txt variant="label" style={{ marginTop: space.xxl }}>Estado del pedido</Txt>
      <View style={styles.timeline}>
        {steps.map((s) => {
          const done = !!when[s];
          return (
            <View key={s} style={styles.step}>
              <View style={[styles.stepBar, done && { backgroundColor: color.ink }]} />
              <View style={{ flex: 1 }}>
                <Txt variant="body" style={{ fontFamily: done ? font.bodySemi : font.body, color: done ? color.ink : color.inkSoft }}>{STEP_LABEL[s]}</Txt>
                <Txt variant="small" numeric>
                  {when[s] ?? (s === 'listo' ? 'Te avisamos con una notificación' : 'Cuando lo recojas en la sucursal')}
                </Txt>
              </View>
            </View>
          );
        })}
      </View>

      <Txt variant="label" style={{ marginTop: space.xxl }}>Lo que pagaste</Txt>
      <View style={{ marginTop: space.s, gap: space.s }}>
        {order.items.map((i) => {
          const p = getProduct(order.branchId, i.productId);
          return (
            <View key={i.productId} style={styles.row}>
              <Txt variant="body" style={{ flex: 1 }}>{i.qty} × {p ? productLabel(p) : i.productId}</Txt>
              <Txt variant="body" numeric>{money(i.price * i.qty)}</Txt>
            </View>
          );
        })}
        {order.pointsUsed ? (
          <View style={styles.row}>
            <Txt variant="body" style={{ flex: 1 }}>Descuento con {order.pointsUsed} puntos</Txt>
            <Txt variant="body" numeric>−{money(subtotal - order.total)}</Txt>
          </View>
        ) : null}
        <View style={styles.row}>
          <Txt variant="heading" style={{ flex: 1 }}>Total</Txt>
          <Txt variant="heading" numeric>{money(order.total)}</Txt>
        </View>
        <Txt variant="small" numeric>Pagado con tarjeta por Stripe. Referencia: {order.paymentRef}</Txt>
        {!cancelled && pointsEarned(order.total) ? (
          <Txt variant="small" numeric>Con este pedido ganaste {pointsEarned(order.total)} puntos en {branch.name}.</Txt>
        ) : null}
      </View>

      {!toPickUp ? (
        <Button variant="secondary" label={`Ver la tienda de ${branch.name}`} onPress={() => router.push(`/tienda/${branch.id}`)} style={{ marginTop: space.xxl }} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pickup: { marginTop: space.xl, backgroundColor: color.sunken, borderRadius: radius.control, padding: space.l, gap: 2 },
  timeline: { marginTop: space.m, gap: space.m },
  step: { flexDirection: 'row', gap: space.m },
  stepBar: { width: 3, borderRadius: 2, backgroundColor: color.sunken },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: space.m },
});
