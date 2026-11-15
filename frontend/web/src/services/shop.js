// Demo implementation of the store API for the business (RF-W19 to RF-W21,
// RF-W24, RN-06, RN-07, RN-09). Products and stock per branch, orders
// paid in the app with Stripe, and the loyalty rules of each business.
// Same products, stock and orders as the mobile app (frontend/mobile/src/data/shop.js).
// In production the refund is a Stripe Refund in test mode and the API
// stores only its reference (RN-17).
import { useSyncExternalStore } from 'react'
import frasco from '../assets/photos/producto-frasco.jpg'
import { DEMO_TODAY } from '../data/demo'
import { ApiError } from './auth'
import { getDemoEstado } from './panel'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const d = (m, day, h = 12, min = 0) => new Date(2026, m - 1, day, h, min)

export const ORDER_STATE = { pagado: 'Pagado', listo: 'Listo para recoger', entregado: 'Entregado', cancelado: 'Cancelado' }
// What the client sees in "Mis pedidos" (same texts as the app).
export const CLIENT_ORDER_STATE = { pagado: 'Pagado, todavía no está listo', listo: 'Listo para recoger', entregado: 'Entregado', cancelado: 'Cancelado y reembolsado por Stripe' }
// The next step of each state; any order not delivered yet can be cancelled.
export const NEXT = { pagado: 'listo', listo: 'entregado' }

const product = (id, branchId, data) => ({ id: `${branchId}:${id}`, sku: id, branchId, ...data })
const CATALOG = {
  pomada: { name: 'Pomada mate', size: '100 g', price: 230, photo: frasco, description: 'Fijación media sin brillo que se quita con agua. Es la que usa Luis para terminar los fades.', howTo: 'Toma una cantidad del tamaño de un chícharo, frótala entre las manos y aplícala con el cabello seco.' },
  aceite: { name: 'Aceite para barba', size: '30 ml', price: 190, photo: null, description: 'Suaviza la barba y quita la comezón de las primeras semanas. Aroma a cedro.', howTo: 'De 3 a 4 gotas después de bañarte, de la raíz a las puntas.' },
  shampoo: { name: 'Shampoo matizador', size: '300 ml', price: 310, photo: null, description: 'Neutraliza el tono amarillo en canas y cabello decolorado.', howTo: 'Úsalo una o dos veces por semana; déjalo 3 minutos antes de enjuagar.' },
  cera: { name: 'Cera fijación media', size: '', price: 210, photo: null, description: 'Para peinados con textura que puedes rehacer durante el día.', howTo: 'Calienta un poco entre los dedos y peina en seco o con el cabello húmedo.' },
}

function seed() {
  const products = [
    product('pomada', 'los-compas-centro', { ...CATALOG.pomada, stock: 14 }),
    product('aceite', 'los-compas-centro', { ...CATALOG.aceite, stock: 6 }),
    product('shampoo', 'los-compas-centro', { ...CATALOG.shampoo, stock: 0 }),
    product('cera', 'los-compas-centro', { ...CATALOG.cera, stock: 22 }),
    product('pomada', 'los-compas-norte', { ...CATALOG.pomada, stock: 3 }),
    product('cera', 'los-compas-norte', { ...CATALOG.cera, stock: 5 }),
  ]
  const line = (sku, branchId, qty) => ({ productId: `${branchId}:${sku}`, name: `${CATALOG[sku].name}${CATALOG[sku].size ? ` ${CATALOG[sku].size}` : ''}`, qty, price: CATALOG[sku].price })
  const orders = [
    {
      folio: 'P-2281', businessId: 'los-compas', branchId: 'los-compas-centro', client: 'Jorge Méndez', items: [line('pomada', 'los-compas-centro', 2)], pointsUsed: 0, paymentRef: 'pi_3QJ1aB2eZvKYlo2C0Xk9pLmN',
      status: 'pagado', timeline: [['pagado', d(11, 12, 9, 41)]],
    },
    {
      folio: 'P-2280', businessId: 'los-compas', branchId: 'los-compas-norte', client: 'Luz Gámez', items: [line('cera', 'los-compas-norte', 1)], pointsUsed: 0, paymentRef: 'pi_3QIzQe2eZvKYlo2C1rT5uVwX',
      status: 'pagado', timeline: [['pagado', d(11, 11, 19, 3)]],
    },
    {
      // Same order the client Andrea sees in the mobile app.
      folio: 'P-2279', businessId: 'los-compas', branchId: 'los-compas-centro', client: 'Andrea Valenzuela', items: [line('aceite', 'los-compas-centro', 1)], pointsUsed: 0, paymentRef: 'pi_3QIx4m2eZvKYlo2C0qW8dRtz',
      status: 'listo', timeline: [['pagado', d(11, 10, 18, 12)], ['listo', d(11, 11, 11, 30)]],
    },
    {
      folio: 'P-2272', businessId: 'los-compas', branchId: 'los-compas-centro', client: 'Carlos Ríos', items: [line('cera', 'los-compas-centro', 1), line('aceite', 'los-compas-centro', 1)], pointsUsed: 0, paymentRef: 'pi_3QHq8w2eZvKYlo2C0bH3yZaC',
      status: 'entregado', timeline: [['pagado', d(11, 6, 13, 20)], ['listo', d(11, 6, 15, 0)], ['entregado', d(11, 7, 12, 10)]],
    },
    {
      folio: 'P-2264', businessId: 'los-compas', branchId: 'los-compas-centro', client: 'Andrea Valenzuela', items: [line('cera', 'los-compas-centro', 1)], pointsUsed: 73, discount: 73, paymentRef: 'pi_3QH8sK2eZvKYlo2C1aX4TbQe',
      status: 'entregado', timeline: [['pagado', d(11, 2, 12, 14)], ['listo', d(11, 2, 13, 2)], ['entregado', d(11, 3, 18, 40)]],
    },
    {
      folio: 'P-2250', businessId: 'los-compas', branchId: 'los-compas-norte', client: 'Andrea Valenzuela', items: [line('pomada', 'los-compas-norte', 1)], pointsUsed: 0, paymentRef: 'pi_3QDzRt2eZvKYlo2C0mN7wLsP',
      status: 'cancelado', refund: { amount: 230, ref: 're_3QDzRt2eZvKYlo2C0aB1cD2e', reason: 'La sucursal se quedó sin pomada.' }, timeline: [['pagado', d(10, 24, 10, 30)], ['cancelado', d(10, 24, 11, 5)]],
    },
  ]
  // Stock movements (RF-W20): sales lower the stock when the payment is confirmed (RN-07).
  const moves = [
    { id: 'mv1', productId: 'los-compas-centro:pomada', on: d(11, 12, 9, 41), change: -2, reason: 'Venta, pedido P-2281' },
    { id: 'mv2', productId: 'los-compas-norte:cera', on: d(11, 11, 19, 3), change: -1, reason: 'Venta, pedido P-2280' },
    { id: 'mv3', productId: 'los-compas-centro:aceite', on: d(11, 10, 18, 12), change: -1, reason: 'Venta, pedido P-2279' },
    { id: 'mv4', productId: 'los-compas-centro:pomada', on: d(11, 9, 11, 0), change: 12, reason: 'Llegó mercancía' },
    { id: 'mv5', productId: 'los-compas-centro:cera', on: d(11, 6, 13, 20), change: -1, reason: 'Venta, pedido P-2272' },
    { id: 'mv6', productId: 'los-compas-centro:aceite', on: d(11, 6, 13, 20), change: -1, reason: 'Venta, pedido P-2272' },
    { id: 'mv7', productId: 'los-compas-centro:shampoo', on: d(11, 5, 17, 45), change: -1, reason: 'Venta, pedido P-2270' },
    { id: 'mv8', productId: 'los-compas-centro:cera', on: d(11, 2, 12, 14), change: -1, reason: 'Venta, pedido P-2264' },
  ]
  // RF-W24 / RN-09: points are earned and spent only in this business.
  const loyalty = { 'los-compas': { pesosPerPointAppointments: 10, pesosPerPointPurchases: 10, pesosPerPointRedeemed: 1 } }
  return { products, orders, moves, loyalty }
}

let state = seed()
const listeners = new Set()
const set = (fn) => {
  state = fn(state)
  listeners.forEach((l) => l())
}
const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const useShopStore = () => useSyncExternalStore(subscribe, () => state)

export function resetDemoShop(estado) {
  state = seed()
  if (estado === 'sin-productos') state = { ...state, products: [], moves: [] }
  if (estado === 'sin-pedidos') state = { ...state, orders: [] }
}
function failIfForced() {
  if (getDemoEstado() === 'error-guardar') throw new ApiError('server')
  if (getDemoEstado() === 'error-stripe') throw new ApiError('stripe')
}

// discount: pesos taken off with points, fixed when the order was paid.
export const orderTotal = (o) => o.items.reduce((s, it) => s + it.qty * it.price, 0) - (o.discount ?? 0)
export const productLabel = (p) => (p.size ? `${p.name} ${p.size}` : p.name)
export const loyaltyFor = (s, businessId) => s.loyalty[businessId] ?? { pesosPerPointAppointments: 10, pesosPerPointPurchases: 10, pesosPerPointRedeemed: 1 }

// ---------- Products and stock (RF-W19, RF-W20) ----------

export async function saveProduct(branchId, data) {
  await wait(700)
  failIfForced()
  let saved
  set((s) => {
    if (data.id) {
      saved = data
      return { ...s, products: s.products.map((p) => (p.id === data.id ? { ...p, ...data } : p)) }
    }
    saved = { ...data, id: `${branchId}:p-${Date.now()}`, sku: `p-${Date.now()}`, branchId }
    const moves = saved.stock ? [{ id: `mv-${Date.now()}`, productId: saved.id, on: DEMO_TODAY, change: saved.stock, reason: 'Existencia inicial' }, ...s.moves] : s.moves
    return { ...s, products: [...s.products, saved], moves }
  })
  return saved
}

export async function adjustStock(productId, newStock, reason) {
  await wait(600)
  failIfForced()
  set((s) => {
    const p = s.products.find((x) => x.id === productId)
    const change = newStock - p.stock
    return {
      ...s,
      products: s.products.map((x) => (x.id === productId ? { ...x, stock: newStock } : x)),
      moves: change ? [{ id: `mv-${Date.now()}`, productId, on: DEMO_TODAY, change, reason }, ...s.moves] : s.moves,
    }
  })
}

// ---------- Orders (RF-W21, RN-06) ----------

export async function advanceOrder(folio) {
  await wait(600)
  failIfForced()
  set((s) => ({ ...s, orders: s.orders.map((o) => (o.folio === folio ? { ...o, status: NEXT[o.status], timeline: [...o.timeline, [NEXT[o.status], DEMO_TODAY]] } : o)) }))
}

// A paid order that is cancelled is refunded with Stripe (RN-06). The
// pieces go back to the branch stock, since they were never picked up.
export async function cancelOrder(folio, reason) {
  await wait(1000)
  failIfForced()
  set((s) => {
    const o = s.orders.find((x) => x.folio === folio)
    const refund = { amount: orderTotal(o), ref: `re_${o.paymentRef.slice(3, 15)}${Date.now().toString(36)}`, reason }
    return {
      ...s,
      orders: s.orders.map((x) => (x.folio === folio ? { ...x, status: 'cancelado', refund, timeline: [...x.timeline, ['cancelado', DEMO_TODAY]] } : x)),
      products: s.products.map((p) => {
        const it = o.items.find((i) => i.productId === p.id)
        return it ? { ...p, stock: p.stock + it.qty } : p
      }),
      moves: [...o.items.map((it, i) => ({ id: `mv-${Date.now()}-${i}`, productId: it.productId, on: DEMO_TODAY, change: it.qty, reason: `Pedido ${folio} cancelado` })), ...s.moves],
    }
  })
}

// ---------- Loyalty (RF-W24) ----------

export async function saveLoyalty(businessId, rules) {
  await wait(700)
  failIfForced()
  set((s) => ({ ...s, loyalty: { ...s.loyalty, [businessId]: rules } }))
}
