// Products sold for pickup at each branch, the carts (one per branch, up to
// 3), orders and loyalty points. In-memory stores for the demo; in production
// the carts are kept in the client's account (RN-18).
import { useEffect, useSyncExternalStore } from 'react';
import { stock as sharedStock } from '@shared/seed';
import { MAX_CARTS as SHARED_MAX_CARTS, cartProblem, paymentProblem, pointsProblem, quantityProblem, type Problem } from '@shared/rules';
import { ApiError } from '@shared/store';
import { businesses, products as baseProducts } from './demo';
import { getBranch } from './catalog';
import { notificationStore } from './notifications';
import { time } from '../theme/format';
import type { Branch, Cart, CartItem, Order, Photo, PointsMovement, Product, StatusColor, StatusText } from '../types/domain';
import type { PaymentResult } from '../services/payments';

type ProductDetails = { photo?: Photo; photoFile?: string; description: string; howTo: string };

// Loyalty rules set by each business (web batch W8): $10 in products = 1
// point, 1 point = $1 off products of that same business.
export const PESOS_PER_POINT_EARNED = 10;
export const PESOS_PER_POINT_SPENT = 1;

const details: Record<string, ProductDetails> = {
  pomada: {
    photo: require('../../assets/photos/producto-frasco.jpg'),
    description: 'Fijación media sin brillo que se quita con agua. Es la que usa Luis para terminar los fades.',
    howTo: 'Toma una cantidad del tamaño de un chícharo, frótala entre las manos y aplícala con el cabello seco.',
  },
  aceite: {
    photoFile: 'aceite-para-barba.jpg',
    description: 'Suaviza la barba y quita la comezón de las primeras semanas. Aroma a cedro.',
    howTo: 'De 3 a 4 gotas después de bañarte, de la raíz a las puntas.',
  },
  shampoo: {
    photoFile: 'shampoo-matizador.jpg',
    description: 'Neutraliza el tono amarillo en canas y cabello decolorado.',
    howTo: 'Úsalo una o dos veces por semana; déjalo 3 minutos antes de enjuagar.',
  },
  cera: {
    photoFile: 'cera-fijacion-media.jpg',
    description: 'Para peinados con textura que puedes rehacer durante el día.',
    howTo: 'Calienta un poco entre los dedos y peina en seco o con el cabello húmedo.',
  },
};

// Stock per branch (pieces), from the data shared with the web panel.
const stockByBranch: Record<string, Record<string, number>> = JSON.parse(JSON.stringify(sharedStock));

export function productsFor(branchId: string): Product[] {
  const stock = stockByBranch[branchId] ?? {};
  return baseProducts
    .filter((p) => p.id in stock)
    .map((p) => ({ ...p, ...details[p.id], stock: stock[p.id], branchId }));
}

export const getProduct = (branchId: string, productId: string): Product | undefined => productsFor(branchId).find((p) => p.id === productId);

export const productLabel = (p: Pick<Product, 'name' | 'size'>) => (p.size ? `${p.name} ${p.size}` : p.name);

export const pointsEarned = (amount: number) => Math.floor(amount / PESOS_PER_POINT_EARNED);

// ------------------------------------------------------------------ store
function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (next: T | ((s: T) => T)) => { state = typeof next === 'function' ? (next as (s: T) => T)(state) : next; listeners.forEach((l) => l()); },
    subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
  };
}

// RF-M09, RN-06: one cart per branch, at most 3 open at a time.
export const MAX_CARTS = SHARED_MAX_CARTS;
// The rules live in shared/rules.ts; here they are applied to the carts
// until they move to the shared store (phase 4).
function fail(p: Problem | null) {
  if (p) throw new ApiError(p.code, p.message);
}
// RN-18: a cart without changes for 7 days is emptied.
export const CART_DAYS = 7;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const cartStore = createStore<Cart[]>([]);
// status: pagado | listo | entregado | cancelado (RF-M11, RF-W20). The branch
// changes it on the web and the app shows it in "Mis pedidos".
const SAMPLE_ORDERS: Order[] = [
  {
    folio: 'P-2279', branchId: 'los-compas-centro', items: [{ productId: 'aceite', qty: 1, price: 190 }], total: 190, pointsUsed: 0,
    status: 'listo', paymentRef: 'pi_3QIx4m2eZvKYlo2C0qW8dRtz', placedOn: 'martes 10 de noviembre',
    timeline: [['pagado', 'martes 10 de noviembre, 6:12 pm'], ['listo', 'miércoles 11 de noviembre, 11:30 am']],
  },
  {
    folio: 'P-2264', branchId: 'los-compas-centro', items: [{ productId: 'cera', qty: 1, price: 210 }], total: 137, pointsUsed: 73, placedOn: 'lunes 2 de noviembre',
    status: 'entregado', paymentRef: 'pi_3QH8sK2eZvKYlo2C1aX4TbQe',
    timeline: [['pagado', 'lunes 2 de noviembre, 12:14 pm'], ['listo', 'lunes 2 de noviembre, 1:02 pm'], ['entregado', 'martes 3 de noviembre, 6:40 pm']],
  },
  {
    folio: 'P-2250', branchId: 'los-compas-norte', items: [{ productId: 'pomada', qty: 1, price: 230 }], total: 230, pointsUsed: 0, placedOn: 'sábado 24 de octubre',
    status: 'cancelado', paymentRef: 'pi_3QDzRt2eZvKYlo2C0mN7wLsP', refund: { amount: 230, note: 'La sucursal se quedó sin pomada.' },
    timeline: [['pagado', 'sábado 24 de octubre, 10:30 am'], ['cancelado', 'sábado 24 de octubre, 11:05 am']],
  },
];
const orderStore = createStore<Order[]>(SAMPLE_ORDERS);

// Open carts, oldest first. Every screen that shows them also empties the
// ones that expired (the API does it in production).
export function useCarts() {
  const carts = useSyncExternalStore(cartStore.subscribe, cartStore.get, cartStore.get);
  useEffect(() => { cart.expire(); }, []);
  return carts;
}
export const getCart = (branchId: string | undefined) => cartStore.get().find((c) => c.branchId === branchId);
export const openCarts = () => cartStore.get();
export function useOrders() {
  return useSyncExternalStore(orderStore.subscribe, orderStore.get, orderStore.get);
}

// SRS v1.2, 4.2.1 "Tienda": stock in a green label («8 disponibles») or a
// red «Agotado».
export function stockStatus(stock: number): StatusText {
  return stock > 0
    ? { label: `${stock} ${stock === 1 ? 'disponible' : 'disponibles'}`, color: 'verde', icon: 'check' }
    : { label: 'Agotado', color: 'rojo', icon: 'atencion' };
}

// SRS v1.2, 4.2.1 "Mis pedidos": label, color and icon of each order.
export function orderStatusOf(order: Order): StatusText {
  switch (order.status) {
    case 'pagado': return { label: 'Pagado · en preparación', color: 'verde', icon: 'check' };
    case 'listo': return { label: 'Listo para recoger', color: 'azul', icon: 'bolsa' };
    case 'entregado': return { label: 'Entregado', color: 'gris', icon: 'check' };
    case 'cancelado': return { label: 'Cancelado · reembolsado', color: 'rojo', icon: 'cancelada' };
    default: return { label: order.status, color: 'gris', icon: 'info' };
  }
}

// --------------------------------------------------------- loyalty points
// RF-M15, RN-09: points are earned per business (attended appointments and
// purchases) and can only be spent on products of that same business.
// Every movement is kept so the client can see where the balance comes from.
const SAMPLE_LEDGER: PointsMovement[] = [
  { id: 'm6', businessId: 'los-compas', points: 19, label: 'Compra, pedido P-2279', date: 'martes 10 de noviembre', route: '/pedido/P-2279' },
  { id: 'm5', businessId: 'los-compas', points: 13, label: 'Compra, pedido P-2264', date: 'lunes 2 de noviembre', route: '/pedido/P-2264' },
  { id: 'm4', businessId: 'los-compas', points: -73, label: 'Canjeaste en el pedido P-2264', date: 'lunes 2 de noviembre', route: '/pedido/P-2264' },
  { id: 'm3', businessId: 'los-compas', points: 22, label: 'Fade, cita C-10431 atendida', date: 'sábado 31 de octubre', route: '/cita/C-10431' },
  { id: 'm2', businessId: 'los-compas', points: 18, label: 'Corte clásico, cita C-10402 atendida', date: 'sábado 17 de octubre', route: '/cita/C-10402' },
  { id: 'm1', businessId: 'los-compas', points: 28, label: 'Corte + barba, cita C-10318 atendida', date: 'sábado 12 de septiembre', route: '/cita/C-10318' },
];
const ledgerStore = createStore<PointsMovement[]>(SAMPLE_LEDGER);

export function usePointsLedger() {
  return useSyncExternalStore(ledgerStore.subscribe, ledgerStore.get, ledgerStore.get);
}

export function pointsAt(businessId: string) {
  return ledgerStore.get().filter((m) => m.businessId === businessId).reduce((s, m) => s + m.points, 0);
}

// Balance per business the client has points history with, highest first.
export function pointBalances(ledger = ledgerStore.get()) {
  return businesses
    .map((b) => ({ businessId: b.id, businessName: b.name, points: ledger.filter((m) => m.businessId === b.id).reduce((s, m) => s + m.points, 0), movements: ledger.filter((m) => m.businessId === b.id) }))
    .filter((b) => b.movements.length)
    .sort((a, b) => b.points - a.points);
}

const branchName = (branchId: string) => getBranch(branchId)?.name ?? 'la sucursal';

// Adds or changes one cart; a cart left without products disappears.
function updateCart(branchId: string, update: (c: Cart | undefined) => Cart) {
  cartStore.set((list) => {
    const current = list.find((c) => c.branchId === branchId);
    const next = update(current);
    if (!next.items.length) return list.filter((c) => c.branchId !== branchId);
    return current ? list.map((c) => (c.branchId === branchId ? next : c)) : [...list, next];
  });
}

export const cart = {
  // 'limit': there are already 3 carts and none is from this branch; the
  // product is not added until one is paid or emptied.
  add(branchId: string, productId: string, qty = 1): 'added' | 'limit' | 'out-of-stock' {
    const list = cartStore.get();
    const current = list.find((c) => c.branchId === branchId);
    if (cartProblem(list.map((c) => c.branchId), branchId)) return 'limit';
    const product = getProduct(branchId, productId);
    if (!product || product.stock <= 0) return 'out-of-stock';
    if (!Number.isInteger(qty) || qty < 1) return 'added';
    const existing = current?.items.find((i) => i.productId === productId);
    const nextQty = Math.min(product.stock, (existing?.qty ?? 0) + qty);
    updateCart(branchId, (c) => ({
      branchId,
      updatedAt: Date.now(),
      items: existing
        ? (c?.items ?? []).map((i) => (i.productId === productId ? { ...i, qty: nextQty } : i))
        : [...(c?.items ?? []), { productId, qty: nextQty, price: product.price }],
    }));
    return 'added';
  },
  // RN-07: whole pieces, never more than the branch has.
  setQty(branchId: string, productId: string, qty: number) {
    const product = getProduct(branchId, productId);
    if (!product) return;
    if (quantityProblem(qty, product.stock)) qty = Math.max(0, Math.min(Math.floor(qty) || 0, product.stock));
    updateCart(branchId, (c) => {
      const items = c?.items ?? [];
      return {
        branchId,
        updatedAt: Date.now(),
        items: qty <= 0 ? items.filter((i) => i.productId !== productId) : items.map((i) => (i.productId === productId ? { ...i, qty } : i)),
      };
    });
  },
  remove(branchId: string, productId: string) { cart.setQty(branchId, productId, 0); },
  empty(branchId: string) { cartStore.set((list) => list.filter((c) => c.branchId !== branchId)); },
  clearAll() { cartStore.set([]); },
  seed(carts: Cart[]) { cartStore.set(carts); },
  // RN-18, RF-M16: notice one day before, then empty the cart at 7 days.
  expire(now = Date.now()) {
    const list = cartStore.get();
    const gone = list.filter((c) => cartExpiry(c, now).msLeft <= 0);
    const warn = list.filter((c) => !c.warned && !gone.includes(c) && cartExpiry(c, now).soon);
    if (!gone.length && !warn.length) return;
    gone.forEach((c) => notificationStore.push({
      kind: 'carrito-vaciado',
      title: `Se vació tu carrito de ${branchName(c.branchId)}`,
      body: `Pasaron ${CART_DAYS} días sin cambios. Los productos siguen en la tienda si aún los quieres.`,
      route: `/tienda/${c.branchId}`,
    }));
    warn.forEach((c) => notificationStore.push({
      kind: 'carrito-por-vaciar',
      title: `Tu carrito de ${branchName(c.branchId)} se vacía ${cartExpiry(c, now).when}`,
      body: 'Si no lo pagas o cambias antes, se vacía solo. Ábrelo para pagarlo.',
      route: `/carrito?sucursal=${c.branchId}`,
    }));
    cartStore.set(list.filter((c) => !gone.includes(c)).map((c) => (warn.includes(c) ? { ...c, warned: true } : c)));
  },
};

// When the cart empties: "6 días" in gray, or "Caduca mañana" in amber when
// 1 day or less is left (SRS v1.2, 4.1 and 4.2).
export interface CartExpiry { msLeft: number; soon: boolean; label: string; when: string }
export function cartExpiry(c: Cart, now = Date.now()): CartExpiry {
  const at = new Date(c.updatedAt + CART_DAYS * DAY);
  const msLeft = at.getTime() - now;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const atDay = new Date(at);
  atDay.setHours(0, 0, 0, 0);
  const days = Math.round((atDay.getTime() - today.getTime()) / DAY);
  const day = days <= 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`;
  const soon = msLeft <= DAY;
  const left = Math.max(1, Math.ceil(msLeft / DAY));
  return { msLeft, soon, when: `${day} a las ${time(at)}`, label: soon ? `Caduca ${day}` : `${left} ${left === 1 ? 'día' : 'días'}` };
}

// RN-18: a line is billed at today's price and never above the stock. A sold
// out product stays in the cart, marked, and is not charged.
export interface CartLine extends CartItem { product: Product; soldOut: boolean; adjusted: boolean; priceChanged: boolean; billedQty: number }
export interface CartSummary {
  cart: Cart; branch: Branch; lines: CartLine[]; subtotal: number; available: number; usable: number; discount: number; total: number;
  count: number; soldOut: number; expiry: CartExpiry; tone: StatusColor;
}
export function cartSummary(c: Cart, usePoints = false, now = Date.now()): CartSummary | null {
  const branch = getBranch(c.branchId);
  if (!branch) return null;
  const lines = c.items.flatMap((i): CartLine[] => {
    const product = getProduct(c.branchId, i.productId);
    if (!product) return [];
    const soldOut = product.stock <= 0;
    return [{ ...i, product, soldOut, adjusted: !soldOut && i.qty > product.stock, priceChanged: i.price !== product.price, billedQty: soldOut ? 0 : Math.min(i.qty, product.stock) }];
  });
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.billedQty, 0);
  const available = pointsAt(branch.businessId);
  const usable = Math.min(available, Math.floor(subtotal / PESOS_PER_POINT_SPENT));
  const discount = usePoints ? usable * PESOS_PER_POINT_SPENT : 0;
  const soldOut = lines.filter((l) => l.soldOut).length;
  const expiry = cartExpiry(c, now);
  return {
    cart: c,
    branch,
    lines,
    subtotal,
    available,
    usable,
    discount,
    total: subtotal - discount,
    count: lines.reduce((s, l) => s + l.billedQty, 0),
    soldOut,
    expiry,
    // Dot of its tab: red with a sold out product, amber when it expires in
    // 1 day or less, gray otherwise.
    tone: soldOut ? 'rojo' : expiry.soon ? 'ambar' : 'gris',
  };
}

// Demo carts. 'uno': Los Compas with Pomada and Aceite ($420). 'tres': one
// per branch with every warning: price changed and a sold out product (Los
// Compas), quantity adjusted and about to expire (Norte), current (Navaja Fina).
export function seedDemoCarts(kind: 'uno' | 'tres') {
  const now = Date.now();
  const losCompas: Cart = {
    branchId: 'los-compas-centro',
    updatedAt: now - DAY,
    items: [{ productId: 'pomada', qty: 1, price: 230 }, { productId: 'aceite', qty: 1, price: 190 }],
  };
  if (kind === 'uno') { cart.seed([losCompas]); return; }
  cart.seed([
    { ...losCompas, updatedAt: now - 2 * HOUR, items: [{ productId: 'pomada', qty: 1, price: 230 }, { productId: 'aceite', qty: 1, price: 170 }, { productId: 'shampoo', qty: 1, price: 310 }] },
    { branchId: 'los-compas-norte', updatedAt: now - (CART_DAYS - 1) * DAY - 4 * HOUR, items: [{ productId: 'pomada', qty: 5, price: 230 }, { productId: 'cera', qty: 1, price: 210 }] },
    { branchId: 'navaja-fina', updatedAt: now - 1.2 * DAY, items: [{ productId: 'aceite', qty: 1, price: 190 }] },
  ]);
}

// Checked before charging: stock (RN-07) and points of this business only,
// never more than the balance or the purchase (RN-09). Throws an ApiError.
export function checkOrder(summary: CartSummary) {
  if (!summary.count) throw new ApiError('invalid', 'Tu carrito no tiene productos disponibles.');
  summary.lines.forEach((l) => fail(quantityProblem(l.billedQty, getProduct(summary.branch.id, l.productId)?.stock ?? 0)));
  fail(pointsProblem(summary.discount / PESOS_PER_POINT_SPENT, pointsAt(summary.branch.businessId), summary.subtotal));
}

let nextFolio = 2291;
// RF-M10: pays one cart. Only that cart goes away; the others stay the same.
// RN-20: the same payment never makes two orders; it gives the one it made.
export function createOrder(summary: CartSummary, payment: Extract<PaymentResult, { status: 'paid' }>) {
  const orders = orderStore.get();
  if (paymentProblem(orders.map((o) => o.paymentRef), payment.reference)?.code === 'conflict') {
    return orders.find((o) => o.paymentRef === payment.reference)?.folio ?? '';
  }
  const folio = `P-${nextFolio}`;
  nextFolio += 1;
  const billed = summary.lines.filter((l) => l.billedQty > 0);
  orderStore.set((list) => [
    {
      folio,
      branchId: summary.branch.id,
      items: billed.map((l) => ({ productId: l.productId, qty: l.billedQty, price: l.product.price })),
      total: summary.total,
      pointsUsed: summary.discount / PESOS_PER_POINT_SPENT,
      status: 'pagado',
      paymentRef: payment.reference, // RN-17: only the Stripe transaction reference is kept
      placedOn: 'jueves 12 de noviembre',
      timeline: [['pagado', 'hoy, jueves 12 de noviembre, 10:04 am']],
    },
    ...list,
  ]);
  // RF-M15: redeemed points go down and the purchase earns new ones, both in this business.
  const businessId = summary.branch.businessId;
  const used = summary.discount / PESOS_PER_POINT_SPENT;
  const moves: PointsMovement[] = [];
  if (pointsEarned(summary.total)) moves.push({ id: `${folio}-gana`, businessId, points: pointsEarned(summary.total), label: `Compra, pedido ${folio}`, date: 'jueves 12 de noviembre', route: `/pedido/${folio}` });
  if (used) moves.push({ id: `${folio}-canje`, businessId, points: -used, label: `Canjeaste en el pedido ${folio}`, date: 'jueves 12 de noviembre', route: `/pedido/${folio}` });
  ledgerStore.set((l) => [...moves, ...l]);
  // RF-W20, RN-07: stock goes down once the payment is confirmed.
  billed.forEach((l) => {
    const stock = stockByBranch[summary.branch.id];
    stock[l.productId] = Math.max(0, stock[l.productId] - l.billedQty);
  });
  cart.empty(summary.branch.id);
  return folio;
}

export const getOrder = (folio: string | undefined) => orderStore.get().find((o) => o.folio === folio);

// Orders, points and carts belong to the signed-in client. The sample ones
// are Andrea's; any other client starts without history. Called by
// data/session.ts when the client changes.
export function loadClientShop(withSamples: boolean) {
  orderStore.set(withSamples ? SAMPLE_ORDERS : []);
  ledgerStore.set(withSamples ? SAMPLE_LEDGER : []);
  cartStore.set([]);
}
