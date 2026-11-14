// Products sold for pickup at each branch, the cart (one branch at a time),
// orders and loyalty points. In-memory stores for the demo.
import { useSyncExternalStore } from 'react';
import { client, products as baseProducts } from './demo';
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

export function pointsAt(businessId) {
  return client.points.find((x) => x.businessId === businessId)?.points ?? 0;
}

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
const orderStore = createStore([
  // Earlier orders, used by "Mis pedidos" (M6).
  {
    folio: 'P-2264', branchId: 'los-compas-centro', items: [{ productId: 'cera', qty: 1, price: 210 }], total: 210, pointsUsed: 0,
    status: 'entregado', paymentRef: 'pi_3QH8sK2eZvKYlo2C1aX4TbQe',
    timeline: [['pagado', 'lunes 2 de noviembre, 12:14 pm'], ['listo', 'lunes 2 de noviembre, 1:02 pm'], ['entregado', 'martes 3 de noviembre, 6:40 pm']],
  },
  {
    folio: 'P-2250', branchId: 'los-compas-norte', items: [{ productId: 'pomada', qty: 1, price: 230 }], total: 230, pointsUsed: 0,
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
      timeline: [['pagado', 'hoy, jueves 12 de noviembre, 10:04 am']],
    },
    ...list,
  ]);
  // RF-W20, RN-07: stock goes down once the payment is confirmed.
  summary.lines.forEach((l) => {
    const stock = stockByBranch[summary.branch.id];
    stock[l.productId] = Math.max(0, stock[l.productId] - l.qty);
  });
  cart.clear();
  return folio;
}

export const getOrder = (folio) => orderStore.get().find((o) => o.folio === folio);
