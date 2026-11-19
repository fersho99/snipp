import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircleIcon } from 'phosphor-react-native';
import Screen from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import { openStatus, weekSchedule, branchOf } from '../data/catalog';
import { getProduct, pointsEarned, productLabel, useOrders } from '../data/shop';
import { money } from '../theme/format';
import { color, font, radius, space, status as statusColor } from '../theme/tokens';

// Shown when the folio is opened directly (screen index), without paying first.
const SAMPLE = {
  folio: 'P-2291',
  branchId: 'los-compas-centro',
  items: [{ productId: 'pomada', qty: 1, price: 230 }, { productId: 'aceite', qty: 1, price: 190 }],
  total: 420,
  pointsUsed: 0,
  status: 'pagado',
  paymentRef: 'pi_3QJ2nB2eZvKYlo2C1rT9xVhd',
  timeline: [['pagado', 'hoy, jueves 12 de noviembre, 10:04 am']],
};

// Order confirmed: folio, status "Pagado", where and when to pick it up.
export default function OrderConfirmed() {
  const { folio = 'P-2291' } = useLocalSearchParams<{ folio?: string }>();
  const orders = useOrders();
  const order = orders.find((o) => o.folio === folio) ?? SAMPLE;
  const branch = branchOf(order.branchId);
  const status = openStatus(branch);
  const today = weekSchedule(branch).find((d) => d.today);
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <Screen
      footer={
        <View style={{ gap: space.s }}>
          <Button label="Volver al inicio" onPress={() => router.replace('/inicio')} />
          <Button variant="secondary" label={`Seguir viendo la tienda`} onPress={() => router.replace(`/tienda/${branch.id}`)} />
        </View>
      }
    >
      <View style={[styles.status, { marginTop: space.xxxl }]}>
        <CheckCircleIcon size={20} color={statusColor.verde.text} weight="fill" />
        <Txt variant="label" style={{ fontFamily: font.bodySemi }}>Pagado con tarjeta por Stripe</Txt>
      </View>
      <Txt variant="small" numeric style={{ marginTop: space.xs }}>Referencia de pago: {order.paymentRef}</Txt>
      <Txt variant="display" accessibilityRole="header" style={{ marginTop: space.l }}>
        Pedido {order.folio}: lo recoges en {branch.name}
      </Txt>
      <Txt variant="body" style={{ marginTop: space.m }}>
        Te avisamos con una notificación cuando esté listo para recoger.
        {status.open ? ` Hoy la sucursal ${status.label.replace('Abierto', 'abre')}.` : ` ${status.label}.`}
      </Txt>

      <View style={styles.pickup}>
        <Txt variant="small">Dónde</Txt>
        <Txt variant="body" style={{ fontFamily: font.bodySemi }}>{branch.address}, {branch.neighborhood}</Txt>
        <Txt variant="small" style={{ marginTop: space.m }}>Horario de hoy</Txt>
        <Txt variant="body" numeric>{today?.label}</Txt>
        <Txt variant="small" style={{ marginTop: space.m }}>Al recoger</Txt>
        <Txt variant="body">Muestra el folio {order.folio}. Si va otra persona por ti, solo necesita el folio.</Txt>
      </View>

      {/* Status timeline: typographic, date and time per step */}
      <Txt variant="label" style={{ marginTop: space.xxl }}>Estado del pedido</Txt>
      <View style={styles.timeline}>
        <Step label="Pagado" when={order.timeline[0][1]} done />
        <Step label="Listo para recoger" when="Te avisamos con una notificación" />
        <Step label="Entregado" when="Cuando lo recojas en la sucursal" />
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
        <Txt variant="small" numeric>Ganaste {pointsEarned(order.total)} puntos en este negocio.</Txt>
      </View>
    </Screen>
  );
}

function Step({ label, when, done }: { label: string; when: string; done?: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepBar, done && { backgroundColor: color.ink }]} />
      <View style={{ flex: 1 }}>
        <Txt variant="body" style={{ fontFamily: done ? font.bodySemi : font.body, color: done ? color.ink : color.inkSoft }}>{label}</Txt>
        <Txt variant="small" numeric>{when}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  pickup: { marginTop: space.xl, backgroundColor: color.sunken, borderRadius: radius.control, padding: space.l, gap: 2 },
  timeline: { marginTop: space.m, gap: space.m },
  step: { flexDirection: 'row', gap: space.m },
  stepBar: { width: 3, borderRadius: 2, backgroundColor: color.sunken },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: space.m },
});
