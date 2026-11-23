// Products sold for pickup at each branch, the carts (one per branch, up to
// 3), orders and loyalty points, in the database shared with the web panel
// (frontend/shared/shop.ts). The carts are kept in the client's account
// (RN-18); paying one creates the order the branch sees in the panel, and
// what the branch does with it (ready, delivered, cancelled) shows up here.
import { useEffect, useSyncExternalStore } from 'react';
import { sessionAccount } from '@shared/auth';
import { dayMonth } from '@shared/effects';
import { fromIso, fromIsoDateTime } from '@shared/dates';
import * as sharedShop from '@shared/shop';
import { getData, subscribe as onDataChange } from '@shared/store';
import type { DemoData, Order as SharedOrder, PointsMovement as SharedPoints } from '@shared/types';
import { MAX_CARTS as SHARED_MAX_CARTS, cartProblem, paymentProblem, pointsProblem, quantityProblem, type Problem } from '@shared/rules';
import { ApiError } from '@shared/store';
import { businesses, client, products as baseProducts } from './demo';
import { getBranch } from './catalog';
import { notificationStore } from './notifications';
import { longDate, time } from '../theme/format';
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

// Stock per branch (pieces), as the panel last saved it.
export function productsFor(branchId: string): Product[] {
  const stock = getData().stock[branchId] ?? {};
  return baseProducts
    .filter((p) => p.id in stock)
    .map((p) => ({ ...p, ...details[p.id], stock: stock[p.id], branchId }));
}

export const getProduct = (branchId: string, productId: string): Product | undefined => productsFor(branchId).find((p) => p.id === productId);

export const productLabel = (p: Pick<Product, 'name' | 'size'>) => (p.size ? `${p.name} ${p.size}` : p.name);

export const pointsEarned = (amount: number) => Math.floor(amount / PESOS_PER_POINT_EARNED);

// ------------------------------------------------------------------ store
// A view of the shared data for the signed-in client. `set` saves the
// client's carts in their account.
function clientView<T>(build: (d: DemoData, email: string) => T, save?: (next: T) => void) {
  let cache: { data: DemoData; email: string; value: T } | null = null;
  const get = () => {
    const data = getData();
    if (!cache || cache.data !== data || cache.email !== client.email) cache = { data, email: client.email, value: build(data, client.email) };
    return cache.value;
  };
  return {
    get,
    set: (next: T | ((s: T) => T)) => save?.(typeof next === 'function' ? (next as (s: T) => T)(get()) : next),
    subscribe: onDataChange,
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

const cartStore = clientView<Cart[]>(
  (d, email) => d.carts.filter((c) => c.clientEmail === email).map(({ branchId, items, updatedAt, warned }) => ({ branchId, items, updatedAt, ...(warned ? { warned } : {}) })),
  (next) => {
    try {
      sharedShop.saveCarts(next, sessionAccount('app'));
    } catch {
      // Without a session there is no account to keep the carts in.
    }
  },
);
// status: pagado | listo | entregado | cancelado (RF-M11, RF-W20). The branch
// changes it on the web and the app shows it in "Mis pedidos".
const orderCards = new WeakMap<SharedOrder, Order>();
const whenText = (at: string) => `${dayMonth(at.slice(0, 10))}, ${time(fromIsoDateTime(at))}`;
function toAppOrder(o: SharedOrder): Order {
  let out = orderCards.get(o);
  if (!out) {
    const total = o.items.reduce((s, i) => s + i.qty * i.price, 0) - o.discount;
    out = {
      folio: o.folio,
      branchId: o.branchId,
      items: o.items.map(({ productId, qty, price }) => ({ productId, qty, price })),
      total,
      pointsUsed: o.pointsUsed,
      status: o.status,
      paymentRef: o.paymentRef,
      placedOn: longDate(fromIso(o.timeline[0][1].slice(0, 10))),
      ...(o.refund ? { refund: { amount: o.refund.amount, note: o.refund.reason } } : {}),
      timeline: o.timeline.map(([st, at]) => [st, whenText(at)] as [Order['status'], string]),
    };
    orderCards.set(o, out);
  }
  return out;
}
const orderStore = clientView<Order[]>((d, email) => d.orders.filter((o) => o.clientEmail === email).map(toAppOrder));

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
const pointCards = new WeakMap<SharedPoints, PointsMovement>();
function toAppPoints(m: SharedPoints): PointsMovement {
  let out = pointCards.get(m);
  if (!out) {
    out = { id: m.id, businessId: m.businessId, points: m.points, label: m.label, date: longDate(fromIso(m.on)), route: m.route };
    pointCards.set(m, out);
  }
  return out;
}
const ledgerStore = clientView<PointsMovement[]>((d, email) => d.points.filter((m) => m.clientEmail === email).map(toAppPoints));

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

// RF-M10: pays one cart. The shared store creates the order, lowers the
// stock, moves the points of this business and empties only this cart; the
// same payment never makes two orders (RN-20).
export function createOrder(summary: CartSummary, payment: Extract<PaymentResult, { status: 'paid' }>) {
  const billed = summary.lines.filter((l) => l.billedQty > 0);
  const order = sharedShop.placeOrder(
    { branchId: summary.branch.id, items: billed.map((l) => ({ productId: l.productId, qty: l.billedQty })), pointsUsed: summary.discount / PESOS_PER_POINT_SPENT, paymentRef: payment.reference },
    sessionAccount('app'),
  );
  return order.folio;
}

export const getOrder = (folio: string | undefined) => orderStore.get().find((o) => o.folio === folio);

// Orders, points and carts belong to the signed-in client and are read for
// their email, so there is nothing to load when the client changes. Kept
// for data/session.ts.
export function loadClientShop(_withSamples: boolean) {}
