import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LockSimpleIcon, MapPinIcon } from 'phosphor-react-native';
import Screen, { BackButton } from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import { ErrorNote, OfflineState } from '../components/States';
import { ProductPhoto, QtyStepper } from '../components/Shop';
import useConnectivity from '../hooks/useConnectivity';
import { businesses } from '../data/demo';
import { getBranch } from '../data/catalog';
import { cart, cartSummary, createOrder, pointsEarned, productsFor, useCart } from '../data/shop';
import { declineMessage, payOrder } from '../services/payments';
import { money } from '../theme/format';
import { color, font, space, touch } from '../theme/tokens';

// Cart (one branch) and payment with Stripe PaymentSheet.
// Demo: ?demo=lleno seeds Pomada mate + Aceite para barba ($420)
// States: ?estado=vacio | pago-rechazado | sin-conexion
export default function Cart() {
  const { demo, estado } = useLocalSearchParams();
  const { online, retry, retrying } = useConnectivity(estado === 'sin-conexion');
  const c = useCart();
  const [usePoints, setUsePoints] = useState(false);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState(null); // { status, code }
  const [declineNext, setDeclineNext] = useState(estado === 'pago-rechazado');

  useEffect(() => {
    if (estado === 'vacio') cart.clear();
    else if ((demo === 'lleno' || estado === 'pago-rechazado') && !c.items.length) {
      cart.seed('los-compas-centro', [{ productId: 'pomada', qty: 1 }, { productId: 'aceite', qty: 1 }]);
    }
  }, [demo, estado]);

  if (!online) return <OfflineState onRetry={retry} retrying={retrying} detail="Sin internet no podemos cobrar ni apartar tus productos. Tu carrito se queda como está." />;

  const s = cartSummary(c, usePoints);

  if (!s.count) return <EmptyCart />;

  const business = businesses.find((b) => b.id === s.branch.businessId);
  const shortBusiness = business.name.replace('Barbería ', '');

  const pay = async () => {
    setPaying(true);
    setResult(null);
    const r = await payOrder({ simulate: declineNext ? 'declined' : 'paid' });
    setPaying(false);
    if (r.status === 'paid') {
      const folio = createOrder(s, r);
      router.replace({ pathname: '/pedido-confirmado', params: { folio } });
    } else {
      if (r.status === 'declined') setDeclineNext(false);
      setResult(r);
    }
  };

  const footer = (
    <View style={{ gap: space.m }}>
      <View style={styles.pickup}>
        <MapPinIcon size={20} color={color.ink} />
        <Txt variant="small" style={{ color: color.ink, flex: 1 }}>
          Se recoge en {s.branch.address}, no hay envío.
        </Txt>
      </View>
      <Button
        label={result?.status === 'declined' ? `Intentar de nuevo, ${money(s.total)}` : `Pagar ${money(s.total)} con tarjeta`}
        onPress={pay}
        loading={paying}
      />
      <View style={styles.secure}>
        <LockSimpleIcon size={16} color={color.inkSoft} />
        <Txt variant="small">Pago con Stripe. SNIPP no guarda los datos de tu tarjeta.</Txt>
      </View>
    </View>
  );

  return (
    <Screen footer={footer}>
      <BackButton />
      <Txt variant="small" style={{ marginTop: space.s }}>Pedido para recoger en {s.branch.name}</Txt>
      <Txt variant="title" accessibilityRole="header" numeric style={{ marginTop: space.xs }}>
        {s.count} {s.count === 1 ? 'pieza' : 'piezas'} por {money(s.total)}
      </Txt>

      {result?.status === 'declined' ? (
        <View style={{ marginTop: space.xl }}>
          <ErrorNote title={`El pago de ${money(s.total)} no pasó`}>
            {declineMessage(result.code)} No se cobró nada. Prueba con otra tarjeta o revisa con tu banco; tu carrito se queda igual.
          </ErrorNote>
        </View>
      ) : null}
      {result?.status === 'canceled' ? (
        <Txt variant="small" style={{ marginTop: space.l }}>Cerraste la ventana de pago. No se cobró nada y tu carrito sigue aquí.</Txt>
      ) : null}

      <View style={styles.lines}>
        {s.lines.map((l) => (
          <View key={l.productId} style={styles.line}>
            <ProductPhoto product={l.product} size={72} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="body" style={{ fontFamily: font.bodySemi }}>{l.product.name}</Txt>
              <Txt variant="small" numeric>{[l.product.size, `${money(l.product.price)} c/u`].filter(Boolean).join(', ')}</Txt>
              <View style={styles.lineFoot}>
                <QtyStepper value={l.qty} min={0} max={l.product.stock} onChange={(q) => cart.setQty(l.productId, q)} label={`Cantidad de ${l.product.name}`} />
                <Txt variant="body" numeric style={{ fontFamily: font.bodyMedium }}>{money(l.product.price * l.qty)}</Txt>
              </View>
              {l.qty >= l.product.stock ? <Txt variant="small" numeric>Son todas las piezas que hay ({l.product.stock}).</Txt> : null}
            </View>
          </View>
        ))}
      </View>

      {/* Points: only from this same business */}
      <View style={styles.points}>
        {s.available ? (
          <Pressable onPress={() => setUsePoints((v) => !v)} accessibilityRole="switch" accessibilityState={{ checked: usePoints }} style={styles.pointsRow}>
            <View style={{ flex: 1 }}>
              <Txt variant="body" numeric style={{ fontFamily: font.bodyMedium }}>
                Tienes {s.available} puntos en {shortBusiness}: {money(s.usable)} de descuento
              </Txt>
              <Txt variant="small">Los puntos solo se canjean en productos de {business.name}.</Txt>
            </View>
            <Switch
              value={usePoints}
              onValueChange={setUsePoints}
              trackColor={{ false: color.grayLight, true: color.ink }}
              thumbColor={color.white}
              activeThumbColor={color.white}
              activeTrackColor={color.ink}
              accessibilityLabel="Usar puntos"
            />
          </Pressable>
        ) : (
          <Txt variant="body">
            No tienes puntos en {business.name} todavía. Los puntos de otros negocios no aplican aquí.
          </Txt>
        )}
      </View>

      <View style={styles.totals}>
        <Row label="Subtotal" value={money(s.subtotal)} />
        {s.discount ? <Row label={`Descuento con ${s.discount} puntos`} value={`−${money(s.discount)}`} /> : null}
        <Row label="Total" value={money(s.total)} strong />
        <Txt variant="small" numeric style={{ marginTop: space.xs }}>
          Con este pedido ganas {pointsEarned(s.total)} puntos en {shortBusiness}.
        </Txt>
      </View>
    </Screen>
  );
}

function Row({ label, value, strong }) {
  return (
    <View style={styles.row}>
      <Txt variant={strong ? 'heading' : 'body'}>{label}</Txt>
      <Txt variant={strong ? 'heading' : 'body'} numeric>{value}</Txt>
    </View>
  );
}

function EmptyCart() {
  const branch = getBranch('los-compas-centro');
  const available = productsFor(branch.id).filter((p) => p.stock > 0).length;
  return (
    <Screen>
      <BackButton />
      <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>Tu carrito está vacío</Txt>
      <Txt variant="bodySoft" style={{ marginTop: space.s }}>
        Los productos se pagan en la app y se recogen en la sucursal. {branch.name} tiene {available} productos disponibles para recoger hoy.
      </Txt>
      <Button label={`Ver la tienda de ${branch.name.replace("Barbería ", "")}`} onPress={() => router.replace(`/tienda/${branch.id}`)} style={{ marginTop: space.xl }} />
      <Button variant="link" label="Buscar otro negocio" onPress={() => router.replace('/inicio')} style={{ marginTop: space.s }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lines: { marginTop: space.xl, gap: space.xl },
  line: { flexDirection: 'row', gap: space.l, alignItems: 'flex-start' },
  lineFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.s },
  points: { marginTop: space.xxl, backgroundColor: color.sunken, borderRadius: 10, padding: space.l },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: touch },
  totals: { marginTop: space.xl, gap: space.s },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  pickup: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  secure: { flexDirection: 'row', alignItems: 'center', gap: space.xs, justifyContent: 'center' },
});
