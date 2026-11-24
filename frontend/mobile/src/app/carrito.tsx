import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LockSimpleIcon, MapPinIcon } from 'phosphor-react-native';
import Screen, { BackButton } from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import { OfflineState } from '../components/States';
import { ConfirmSheet, ProductPhoto, QtyStepper, expiryStatus, piecesLabel } from '../components/Shop';
import { StatusLine, StatusNotice, TabBar } from '../components/Appointment';
import useConnectivity from '../hooks/useConnectivity';
import { getBusiness } from '../data/demo';
import { cart, cartSummary, checkOrder, createOrder, getCart, pointsEarned, seedDemoCarts, useCarts } from '../data/shop';
import { declineMessage, payOrder } from '../services/payments';
import useAction, { wait } from '../hooks/useAction';
import { money } from '../theme/format';
import { color, font, radius, space, status, stripeWidth, touch } from '../theme/tokens';
import type { ScrollViewInstance } from 'react-native';
import type { Cart as CartData } from '../types/domain';
import type { CartLine, CartSummary } from '../data/shop';

// Carritos (RF-M17): one cart per branch, up to 3 (RF-M09, RN-06). One cart
// is shown at a time; the client moves between them by swiping or by tapping
// the branch tab, and "1 de 3" says where they are. Each cart is paid with
// Stripe on its own and the others stay the same (RF-M10).
// Demo: ?demo=lleno (Los Compas, Pomada + Aceite, $420) | ?demo=tres (3 carts
// with a price change, a sold out product, an adjusted quantity and one
// about to expire). ?sucursal=<id> opens on that branch's cart.
// States: ?estado=vacio | pago-rechazado | error (emptying fails) | sin-conexion
const SIDE = 28; // the next and previous carts peek this much minus GAP
const GAP = 10;

export default function Carts() {
  const { demo, estado, sucursal } = useLocalSearchParams<{ demo?: string; estado?: string; sucursal?: string }>();
  const { online, failure, retry, retrying } = useConnectivity(estado);
  const carts = useCarts();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [index, setIndex] = useState(0);
  const pager = useRef<ScrollViewInstance>(null);
  const jumped = useRef(false);

  useEffect(() => {
    if (estado === 'vacio') cart.clearAll();
    else if (demo === 'tres') seedDemoCarts('tres');
    else if ((demo === 'lleno' || estado === 'pago-rechazado') && !getCart('los-compas-centro')) seedDemoCarts('uno');
  }, [demo, estado]);

  const pageWidth = Math.max(0, size.width - SIDE * 2);
  const interval = pageWidth + GAP;
  const current = Math.min(index, Math.max(0, carts.length - 1));

  const goTo = (i: number, animated = true) => {
    pager.current?.scrollTo({ x: i * interval, animated });
    setIndex(i);
  };

  // Open on the cart of the branch the client came from.
  useEffect(() => {
    if (jumped.current || !size.width || !sucursal) return;
    const i = carts.findIndex((c) => c.branchId === sucursal);
    if (i >= 0) { jumped.current = true; goTo(i, false); }
  }, [size.width, sucursal, carts.length]);

  // A cart paid or emptied disappears; stay on a cart that exists.
  useEffect(() => {
    if (index > carts.length - 1 && carts.length) goTo(carts.length - 1, false);
  }, [carts.length]);

  if (!online) return <OfflineState kind={failure} tabs onRetry={retry} retrying={retrying} detail="Sin internet no podemos cobrar ni apartar tus productos. Tus carritos se quedan como están." />;

  const summaries = carts.map((c) => cartSummary(c)).filter((s): s is CartSummary => !!s);

  return (
    <Screen bottomBar={<TabBar />} scroll={false} padded={false}>
      <View style={styles.head}>
        {sucursal ? <BackButton /> : null}
        <View style={styles.titleRow}>
          <Txt variant="title" accessibilityRole="header">Carritos</Txt>
          {summaries.length ? (
            <Txt variant="label" numeric accessibilityLabel={`Carrito ${current + 1} de ${summaries.length}`}>{current + 1} de {summaries.length}</Txt>
          ) : null}
        </View>
      </View>

      {!summaries.length ? (
        <EmptyCarts />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs} accessibilityRole="tablist">
            {summaries.map((s, i) => {
              const active = i === current;
              return (
                <Pressable
                  key={s.branch.id}
                  onPress={() => goTo(i)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${s.branch.name}, ${toneLabel(s)}`}
                  style={({ pressed }) => [styles.tab, active ? styles.tabActive : pressed && { backgroundColor: color.sunkenPressed }]}
                >
                  <View style={[styles.dot, { backgroundColor: status[s.tone].stripe }]} />
                  <Txt variant="label" style={{ color: active ? color.white : color.ink }} numberOfLines={1}>{s.branch.name}</Txt>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {summaries.map((s, i) => <View key={s.branch.id} style={[styles.pageDot, i === current && styles.pageDotActive]} />)}
          </View>

          <View style={{ flex: 1 }} onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
            {size.width ? (
              <ScrollView
                ref={pager}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={interval}
                decelerationRate="fast"
                disableIntervalMomentum
                scrollEventThrottle={16}
                onScroll={(e) => {
                  const i = Math.round(e.nativeEvent.contentOffset.x / interval);
                  if (i !== index && i >= 0 && i < summaries.length) setIndex(i);
                }}
                contentContainerStyle={{ paddingHorizontal: SIDE }}
                // react-native-web: snap with CSS instead of snapToInterval.
                style={Platform.OS === 'web' ? ({ scrollSnapType: 'x mandatory' } as object) : undefined}
              >
                {summaries.map((s, i) => (
                  <View
                    key={s.branch.id}
                    style={[
                      { width: pageWidth, height: size.height, marginRight: i < summaries.length - 1 ? GAP : 0 },
                      Platform.OS === 'web' ? ({ scrollSnapAlign: 'center' } as object) : null,
                    ]}
                    accessibilityElementsHidden={i !== current}
                    importantForAccessibility={i === current ? 'auto' : 'no-hide-descendants'}
                  >
                    <CartPage data={s.cart} declineFirst={estado === 'pago-rechazado'} failEmpty={estado === 'error'} />
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>

          {summaries.length > 1 ? (
            <Txt variant="small" style={styles.hint}>Desliza para cambiar de carrito</Txt>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const toneLabel = (s: CartSummary) =>
  s.tone === 'rojo' ? 'tiene un producto agotado' : s.tone === 'ambar' ? s.expiry.label.toLowerCase() : `caduca en ${s.expiry.label}`;

// One cart: branch, products, points, total, pay and empty.
function CartPage({ data, declineFirst, failEmpty }: { data: CartData; declineFirst: boolean; failEmpty: boolean }) {
  const [usePoints, setUsePoints] = useState(false);
  const declineNext = useRef(declineFirst && data.branchId === 'los-compas-centro');
  const failEmptyNext = useRef(failEmpty);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const payment = useAction({ busy: 'Pagando...', done: 'Pagado', failed: 'No se pudo pagar' });
  const emptying = useAction({ busy: 'Vaciando...', done: 'Carrito vaciado', failed: 'No se pudo vaciar' });

  const s = cartSummary(data, usePoints);
  if (!s) return null;
  const { branch, expiry } = s;
  const business = getBusiness(branch.businessId);

  // RF-M10: only this cart is charged. The order is created and the cart
  // goes away once the green answer has been shown.
  const pay = () => payment.run(async () => {
    checkOrder(s); // nothing is charged if the cart breaks a rule
    const r = await payOrder({ simulate: declineNext.current ? 'declined' : 'paid' });
    if (r.status === 'declined') {
      declineNext.current = false;
      return { ok: false, reason: `${declineMessage(r.code)} No se cobró nada. Prueba con otra tarjeta o revisa con tu banco.` };
    }
    if (r.status === 'canceled') return { ok: false, reason: 'Cerraste la ventana de pago. No se cobró nada y tu carrito sigue aquí.' };
    return {
      ok: true,
      message: `Listo: pagaste ${money(s.total)} en ${branch.name}`,
      detail: ['Recoge tu pedido en la sucursal.'],
      next: () => router.push({ pathname: '/pedido-confirmado', params: { folio: createOrder(s, r) } }),
    };
  });

  const empty = () => emptying.run(async () => {
    await wait(700);
    if (failEmptyNext.current) {
      failEmptyNext.current = false;
      return { ok: false, reason: 'No pudimos vaciar el carrito. Revisa tu internet e inténtalo de nuevo; tus productos siguen aquí.' };
    }
    return {
      ok: true,
      message: `Vaciaste el carrito de ${branch.name}`,
      detail: ['Tus otros carritos no cambiaron.'],
      next: () => { setConfirmEmpty(false); cart.empty(branch.id); },
    };
  });

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.pageBody} nestedScrollEnabled>
        <Txt variant="heading">{branch.name}</Txt>
        <View style={styles.pickup}>
          <MapPinIcon size={18} color={color.inkSoft} />
          <Txt variant="small" style={{ flex: 1 }}>Se recoge en {branch.address}, no hay envío.</Txt>
        </View>
        <StatusLine status={expiryStatus(expiry)} style={{ marginTop: space.s }} />
        {expiry.soon ? (
          <StatusNotice tone="ambar" icon="reloj" style={{ marginTop: space.m }}>
            <Txt variant="small" style={{ color: color.ink }}>Si no lo pagas o cambias, este carrito se vacía {expiry.when}.</Txt>
          </StatusNotice>
        ) : null}

        <View style={styles.lines}>
          {s.lines.map((l) => <Line key={l.productId} line={l} branchId={branch.id} />)}
        </View>

        {/* Points: only from this same business (RF-M15) */}
        <View style={styles.points}>
          {s.available && s.subtotal ? (
            <Pressable onPress={() => setUsePoints((v) => !v)} accessibilityRole="switch" accessibilityState={{ checked: usePoints }} style={styles.pointsRow}>
              <Txt variant="body" numeric style={{ flex: 1, fontFamily: font.bodyMedium }}>
                Usar {s.usable} puntos de {business.name}: {money(s.usable)} de descuento
              </Txt>
              <Switch
                value={usePoints}
                onValueChange={setUsePoints}
                trackColor={{ false: color.grayLight, true: color.ink }}
                thumbColor={color.white}
                // react-native-web only: thumb and track colors when on.
                {...({ activeThumbColor: color.white, activeTrackColor: color.ink } as object)}
                accessibilityLabel="Usar puntos"
              />
            </Pressable>
          ) : (
            <Txt variant="body">Aún no tienes puntos en {business.name}.</Txt>
          )}
        </View>

        <View style={styles.totals}>
          <Row label="Subtotal" value={money(s.subtotal)} />
          {s.discount ? <Row label={`${s.discount} puntos`} value={`−${money(s.discount)}`} tone={status.verde.text} /> : null}
          <Row label="Total" value={money(s.total)} strong />
          {s.total ? (
            <Txt variant="small" numeric style={{ marginTop: space.xs }}>
              Con este pedido ganas {pointsEarned(s.total)} puntos en {business.name}.
            </Txt>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.pageFoot}>
        <Button
          label={!s.count ? 'No hay productos para cobrar' : `Pagar ${money(s.total)} con tarjeta`}
          {...payment.button}
          onPress={pay}
          disabled={!s.count}
        />
        <View style={styles.secure}>
          <LockSimpleIcon size={16} color={color.inkSoft} />
          <Txt variant="small">Solo se cobra este carrito</Txt>
        </View>
        <Button variant="link" label="Vaciar carrito" onPress={() => setConfirmEmpty(true)} disabled={payment.busy} style={{ alignSelf: 'center' }} />
      </View>

      <ConfirmSheet
        visible={confirmEmpty}
        title={`¿Vaciar el carrito de ${branch.name}?`}
        body={`Se quitan sus ${piecesLabel(s.lines.length)}. Tus otros carritos no cambian.`}
        confirmLabel="Vaciar carrito"
        confirmButton={emptying.button}
        onCancel={() => { if (!emptying.busy) setConfirmEmpty(false); }}
        onConfirm={empty}
      />
    </View>
  );
}

// A product of the cart. RN-18: price changes and lower stock are told in
// amber; a sold out product keeps its line in red and is not charged.
function Line({ line: l, branchId }: { line: CartLine; branchId: string }) {
  if (l.soldOut) {
    return (
      <View style={[styles.line, styles.soldOut]}>
        <ProductPhoto product={l.product} size={64} style={{ opacity: 0.6 }} />
        <View style={{ flex: 1, gap: space.xs }}>
          <Txt variant="body" style={{ fontFamily: font.bodySemi, textDecorationLine: 'line-through' }}>{l.product.name}</Txt>
          <StatusLine status={{ label: 'Agotado · no se cobra', color: 'rojo', icon: 'atencion' }} />
          <Button variant="link" label="Quitar" onPress={() => cart.remove(branchId, l.productId)} style={{ alignSelf: 'flex-start' }} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.line}>
      <ProductPhoto product={l.product} size={64} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="body" style={{ fontFamily: font.bodySemi }}>{l.product.name}</Txt>
        <Txt variant="small" numeric>{[l.product.size, `${money(l.product.price)} c/u`].filter(Boolean).join(', ')}</Txt>
        {l.priceChanged ? (
          <StatusLine status={{ label: `El precio cambió de ${money(l.price)} a ${money(l.product.price)}`, color: 'ambar', icon: 'atencion' }} style={{ marginTop: space.xs }} />
        ) : null}
        {l.adjusted ? (
          <StatusLine status={{ label: `Solo quedan ${l.product.stock}; ajustamos tu cantidad`, color: 'ambar', icon: 'atencion' }} style={{ marginTop: space.xs }} />
        ) : null}
        <View style={styles.lineFoot}>
          <QtyStepper value={l.billedQty} min={0} max={l.product.stock} onChange={(q) => cart.setQty(branchId, l.productId, q)} label={`Cantidad de ${l.product.name}`} />
          <Txt variant="body" numeric style={{ fontFamily: font.bodyMedium }}>{money(l.product.price * l.billedQty)}</Txt>
        </View>
        {!l.adjusted && l.billedQty >= l.product.stock ? <Txt variant="small" numeric>Son todas las piezas que hay ({l.product.stock}).</Txt> : null}
      </View>
    </View>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  const style = tone ? { color: tone } : strong ? { fontFamily: font.bodySemi } : undefined;
  return (
    <View style={styles.row}>
      <Txt variant={strong ? 'heading' : 'body'} style={style}>{label}</Txt>
      <Txt variant={strong ? 'heading' : 'body'} numeric style={style}>{value}</Txt>
    </View>
  );
}

function EmptyCarts() {
  return (
    <View style={styles.empty}>
      <Txt variant="bodySoft">Aún no tienes carritos. Agrega productos desde la tienda de una sucursal.</Txt>
      <Txt variant="small" style={{ marginTop: space.s }}>Puedes tener hasta 3 carritos, uno por sucursal. Se pagan por separado y se recogen en su sucursal.</Txt>
      <Button label="Buscar una sucursal" onPress={() => router.replace('/inicio')} style={{ marginTop: space.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: space.xl },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: space.s },
  tabsScroll: { flexGrow: 0, marginTop: space.m },
  tabs: { paddingHorizontal: space.xl, gap: space.s },
  tab: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: touch - 8, paddingHorizontal: space.m, borderRadius: radius.control, backgroundColor: color.sunken },
  tabActive: { backgroundColor: color.ink },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: space.m },
  pageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.grayLight },
  pageDotActive: { width: 20, backgroundColor: color.ink },
  page: { flex: 1, backgroundColor: color.raised, borderRadius: radius.photo, borderWidth: 1, borderColor: color.divider, overflow: 'hidden' },
  pageBody: { padding: space.l, paddingBottom: space.xl },
  pageFoot: { paddingHorizontal: space.l, paddingTop: space.m, paddingBottom: space.s, gap: space.xs, borderTopWidth: 1, borderTopColor: color.divider },
  pickup: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  lines: { marginTop: space.xl, gap: space.xl },
  line: { flexDirection: 'row', gap: space.m, alignItems: 'flex-start' },
  soldOut: { borderLeftWidth: stripeWidth, borderLeftColor: status.rojo.stripe, paddingLeft: space.s },
  lineFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.s },
  points: { marginTop: space.xl, backgroundColor: color.sunken, borderRadius: radius.control, padding: space.l },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: touch },
  totals: { marginTop: space.xl, gap: space.s },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  secure: { flexDirection: 'row', alignItems: 'center', gap: space.xs, justifyContent: 'center' },
  hint: { textAlign: 'center', marginTop: space.s, marginBottom: space.xs },
  empty: { paddingHorizontal: space.xl, marginTop: space.m },
});
