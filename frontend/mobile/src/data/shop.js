// Products sold for pickup at each branch, the cart (one branch at a time),
// orders and loyalty points. In-memory stores for the demo.
import { useSyncExternalStore } from 'react';
import { businesses, products as baseProducts } from './demo';
import { getBranch } from './catalog';

// Loyalty rules set by each business (web batch W8): $10 in products = 1
// point, 1 point = $1 off products of that same business.
export const PESOS_PER_POINT_EARNED = 10;
export const PESOS_PER_POINT_SPENT = 1;

const details = {
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

// Stock per branch (pieces). Los Compas centro uses the master-prompt counts.
const stockByBranch = {
  'los-compas-centro': { pomada: 14, aceite: 6, shampoo: 0, cera: 22 },
  'los-compas-norte': { pomada: 3, cera: 5 },
  'navaja-fina': { aceite: 4, pomada: 8 },
  'estudio-marisol': {},
};

export function productsFor(branchId) {
  const stock = stockByBranch[branchId] ?? {};
  return baseProducts
    .filter((p) => p.id in stock)
    .map((p) => ({ ...p, ...details[p.id], stock: stock[p.id], branchId }));
}

export const getProduct = (branchId, productId) => productsFor(branchId).find((p) => p.id === productId);

export const productLabel = (p) => (p.size ? `${p.name} ${p.size}` : p.name);

export const pointsEarned = (amount) => Math.floor(amount / PESOS_PER_POINT_EARNED);

// ------------------------------------------------------------------ store
function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    set: (next) => { state = typeof next === 'function' ? next(state) : next; listeners.forEach((l) => l()); },
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
  };
}

const cartStore = createStore({ branchId: null, items: [] }); // items: [{ productId, qty }]
// status: pagado | listo | entregado | cancelado (RF-M11, RF-W20). The branch
// changes it on the web and the app shows it in "Mis pedidos".
const orderStore = createStore([
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
]);

export function useCart() {
  return useSyncExternalStore(cartStore.subscribe, cartStore.get, cartStore.get);
}
export function useOrders() {
  return useSyncExternalStore(orderStore.subscribe, orderStore.get, orderStore.get);
}

export function orderStatusOf(order) {
  switch (order.status) {
    case 'pagado': return { label: 'Pagado, todavía no está listo', tone: 'pending' };
    case 'listo': return { label: 'Listo para recoger', tone: 'done' };
    case 'entregado': return { label: 'Entregado', tone: 'done' };
    case 'cancelado': return { label: 'Cancelado y reembolsado por Stripe', tone: 'stopped' };
    default: return { label: order.status, tone: 'soft' };
  }
}

// --------------------------------------------------------- loyalty points
// RF-M15, RN-09: points are earned per business (attended appointments and
// purchases) and can only be spent on products of that same business.
// Every movement is kept so the client can see where the balance comes from.
const ledgerStore = createStore([
  { id: 'm6', businessId: 'los-compas', points: 19, label: 'Compra, pedido P-2279', date: 'martes 10 de noviembre', route: '/pedido/P-2279' },
  { id: 'm5', businessId: 'los-compas', points: 13, label: 'Compra, pedido P-2264', date: 'lunes 2 de noviembre', route: '/pedido/P-2264' },
  { id: 'm4', businessId: 'los-compas', points: -73, label: 'Canjeaste en el pedido P-2264', date: 'lunes 2 de noviembre', route: '/pedido/P-2264' },
  { id: 'm3', businessId: 'los-compas', points: 22, label: 'Fade, cita C-10431 atendida', date: 'sábado 31 de octubre', route: '/cita/C-10431' },
  { id: 'm2', businessId: 'los-compas', points: 18, label: 'Corte clásico, cita C-10402 atendida', date: 'sábado 17 de octubre', route: '/cita/C-10402' },
  { id: 'm1', businessId: 'los-compas', points: 28, label: 'Corte + barba, cita C-10318 atendida', date: 'sábado 12 de septiembre', route: '/cita/C-10318' },
]);

export function usePointsLedger() {
  return useSyncExternalStore(ledgerStore.subscribe, ledgerStore.get, ledgerStore.get);
}

export function pointsAt(businessId) {
  return ledgerStore.get().filter((m) => m.businessId === businessId).reduce((s, m) => s + m.points, 0);
}

// Balance per business the client has points history with, highest first.
export function pointBalances(ledger = ledgerStore.get()) {
  return businesses
    .map((b) => ({ businessId: b.id, businessName: b.name, points: ledger.filter((m) => m.businessId === b.id).reduce((s, m) => s + m.points, 0), movements: ledger.filter((m) => m.businessId === b.id) }))
    .filter((b) => b.movements.length)
    .sort((a, b) => b.points - a.points);
}

export const cart = {
  // Returns 'other-branch' instead of adding when the cart belongs to another branch.
  add(branchId, productId, qty = 1) {
    const c = cartStore.get();
    if (c.branchId && c.branchId !== branchId && c.items.length) return 'other-branch';
    const product = getProduct(branchId, productId);
    if (!product || product.stock <= 0) return 'out-of-stock';
    const existing = c.items.find((i) => i.productId === productId);
    const nextQty = Math.min(product.stock, (existing?.qty ?? 0) + qty);
    cartStore.set({
      branchId,
      items: existing ? c.items.map((i) => (i.productId === productId ? { ...i, qty: nextQty } : i)) : [...c.items, { productId, qty: nextQty }],
    });
    return 'added';
  },
  setQty(productId, qty) {
    const c = cartStore.get();
    const items = qty <= 0 ? c.items.filter((i) => i.productId !== productId) : c.items.map((i) => (i.productId === productId ? { ...i, qty } : i));
    cartStore.set({ branchId: items.length ? c.branchId : null, items });
  },
  clear() { cartStore.set({ branchId: null, items: [] }); },
  replaceWith(branchId, productId, qty = 1) { cart.clear(); return cart.add(branchId, productId, qty); },
  seed(branchId, items) { cartStore.set({ branchId, items }); },
};

export function cartSummary(c, usePoints) {
  if (!c.branchId) return { lines: [], subtotal: 0, discount: 0, total: 0, count: 0, branch: null, available: 0 };
  const branch = getBranch(c.branchId);
  const lines = c.items.map((i) => ({ ...i, product: getProduct(c.branchId, i.productId) })).filter((l) => l.product);
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const available = pointsAt(branch.businessId);
  const usable = Math.min(available, Math.floor(subtotal / PESOS_PER_POINT_SPENT));
  const discount = usePoints ? usable * PESOS_PER_POINT_SPENT : 0;
  return {
    branch,
    lines,
    subtotal,
    available,
    usable,
    discount,
    total: subtotal - discount,
    count: lines.reduce((s, l) => s + l.qty, 0),
  };
}

let nextFolio = 2291;
export function createOrder(summary, payment) {
  const folio = `P-${nextFolio}`;
  nextFolio += 1;
  orderStore.set((list) => [
    {
      folio,
      branchId: summary.branch.id,
      items: summary.lines.map((l) => ({ productId: l.productId, qty: l.qty, price: l.product.price })),
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
  const moves = [];
  if (pointsEarned(summary.total)) moves.push({ id: `${folio}-gana`, businessId, points: pointsEarned(summary.total), label: `Compra, pedido ${folio}`, date: 'jueves 12 de noviembre', route: `/pedido/${folio}` });
  if (used) moves.push({ id: `${folio}-canje`, businessId, points: -used, label: `Canjeaste en el pedido ${folio}`, date: 'jueves 12 de noviembre', route: `/pedido/${folio}` });
  ledgerStore.set((l) => [...moves, ...l]);
  // RF-W20, RN-07: stock goes down once the payment is confirmed.
  summary.lines.forEach((l) => {
    const stock = stockByBranch[summary.branch.id];
    stock[l.productId] = Math.max(0, stock[l.productId] - l.qty);
  });
  cart.clear();
  return folio;
}

export const getOrder = (folio) => orderStore.get().find((o) => o.folio === folio);
