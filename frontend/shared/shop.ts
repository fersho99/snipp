// The store of each branch (RF-M09 to RF-M11, RF-M15, RF-W20, RF-W21,
// RF-W24): the client's carts, paying one, and what the branch does with
// the order. Paying creates the order, lowers the stock (RN-07), moves the
// points of that business (RN-09) and keeps only the Stripe reference
// (RN-17). A refund puts everything back.
import { requireBusiness } from './catalog'
import { DEMO_TODAY, isoDateTime } from './dates'
import { loyaltyOf, pointsBalance, withNotification, withPoints } from './effects'
import { paymentProblem, pointsProblem, quantityProblem } from './rules'
import { ApiError, commit, getData } from './store'
import type { Account, Cart, LoyaltyRules, Order, OrderStatus } from './types'

const fail = (p: { code: 'invalid' | 'conflict' | 'forbidden' | 'not-found'; message: string } | null) => {
  if (p) throw new ApiError(p.code, p.message)
}
const requireClient = (actor: Account | null) => {
  if (!actor || actor.role !== 'cliente') throw new ApiError('forbidden', 'Entra con tu cuenta para comprar.')
  return actor
}

// ------------------------------------------------------------------- carts

export const cartsOf = (clientEmail: string) => getData().carts.filter((c) => c.clientEmail === clientEmail)

// RN-18: the carts are kept in the client's account. The app applies the
// rules of each change (data/shop.ts) and saves the result here.
export function saveCarts(carts: Omit<Cart, 'clientEmail'>[], actor: Account | null) {
  const client = requireClient(actor)
  commit((d) => ({ ...d, carts: [...d.carts.filter((c) => c.clientEmail !== client.email), ...carts.map((c) => ({ ...c, clientEmail: client.email }))] }))
}

// ------------------------------------------------------------------ paying

export interface PlaceOrder {
  branchId: string
  items: { productId: string; qty: number }[]
  pointsUsed: number
  paymentRef: string
}

// RF-M10: one cart is paid. Prices are today's (RN-18); the same payment
// never makes two orders (RN-20): it answers with the order it made.
export function placeOrder(input: PlaceOrder, actor: Account | null): Order {
  const client = requireClient(actor)
  const d = getData()
  const done = d.orders.find((o) => o.paymentRef === input.paymentRef)
  if (paymentProblem(d.orders.map((o) => o.paymentRef), input.paymentRef)?.code === 'conflict' && done) return done
  fail(paymentProblem([], input.paymentRef))
  const branch = d.branches.find((b) => b.id === input.branchId)
  if (!branch) throw new ApiError('not-found', 'Esa sucursal no existe.')
  const stock = d.stock[branch.id] ?? {}
  const items = input.items.filter((i) => i.qty > 0).map((i) => {
    fail(quantityProblem(i.qty, stock[i.productId] ?? 0))
    const p = d.products.find((x) => x.id === i.productId)
    if (!p) throw new ApiError('not-found', 'Uno de los productos ya no existe.')
    return { productId: p.id, name: p.size ? `${p.name} ${p.size}` : p.name, qty: i.qty, price: p.price }
  })
  if (!items.length) throw new ApiError('invalid', 'Tu carrito no tiene productos disponibles.')
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0)
  const rules = loyaltyOf(d, branch.businessId)
  fail(pointsProblem(input.pointsUsed, pointsBalance(d, client.email, branch.businessId), Math.floor(subtotal / rules.pesosPerPointRedeemed)))
  const discount = input.pointsUsed * rules.pesosPerPointRedeemed
  const number = Math.max(2290, ...d.orders.map((o) => Number(o.folio.slice(2)) || 0)) + 1
  const at = isoDateTime(DEMO_TODAY)
  const order: Order = {
    folio: `P-${number}`, businessId: branch.businessId, branchId: branch.id, clientName: client.name, clientEmail: client.email,
    items, pointsUsed: input.pointsUsed, discount, paymentRef: input.paymentRef, status: 'pagado', timeline: [['pagado', at]],
  }
  const total = subtotal - discount
  commit((x) => {
    let out = {
      ...x,
      orders: [order, ...x.orders],
      stock: { ...x.stock, [branch.id]: { ...x.stock[branch.id], ...Object.fromEntries(items.map((i) => [i.productId, x.stock[branch.id][i.productId] - i.qty])) } },
      stockMoves: [...items.map((i, n) => ({ id: `mv-${order.folio}-${n}`, branchId: branch.id, productId: i.productId, on: at, change: -i.qty, reason: `Venta, pedido ${order.folio}` })), ...x.stockMoves],
      carts: x.carts.filter((c) => !(c.clientEmail === client.email && c.branchId === branch.id)),
    }
    out = withPoints(out, client.email, branch.businessId, -input.pointsUsed, `Canjeaste en el pedido ${order.folio}`, `/pedido/${order.folio}`)
    out = withPoints(out, client.email, branch.businessId, Math.floor(total / rules.pesosPerPointPurchases), `Compra, pedido ${order.folio}`, `/pedido/${order.folio}`)
    return out
  })
  return order
}

// ------------------------------------------------------------ the branch

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { pagado: 'listo', listo: 'entregado' }

function orderFor(folio: string, actor: Account | null) {
  const o = getData().orders.find((x) => x.folio === folio)
  if (!o) throw new ApiError('not-found', 'Ese pedido no existe.')
  requireBusiness(actor, o.businessId, true)
  return o
}

// RF-W21: paid → ready to pick up (the client is told) → delivered.
export function advanceOrder(folio: string, actor: Account | null) {
  const o = orderFor(folio, actor)
  const next = NEXT[o.status]
  if (!next) throw new ApiError('conflict', 'Este pedido ya no cambia de estado.')
  const branch = getData().branches.find((b) => b.id === o.branchId)
  commit((d) => {
    const out = { ...d, orders: d.orders.map((x) => (x.folio === folio ? { ...x, status: next, timeline: [...x.timeline, [next, isoDateTime(DEMO_TODAY)] as [OrderStatus, string]] } : x)) }
    return next === 'listo'
      ? withNotification(out, o.clientEmail, 'pedido-listo', `Tu pedido ${folio} está listo para recoger`, `Recógelo en ${branch?.name ?? 'la sucursal'}, ${branch?.address ?? ''}. Muestra el folio al llegar.`, `/pedido/${folio}`)
      : out
  })
}

// RN-06: a paid order not delivered yet can be cancelled; it is refunded
// with Stripe, the pieces go back and so do the points (RN-20: only once).
export function cancelOrder(folio: string, reason: string, actor: Account | null) {
  const o = orderFor(folio, actor)
  if (o.status !== 'pagado' && o.status !== 'listo') throw new ApiError('conflict', 'Este pedido ya no se puede cancelar.')
  const amount = o.items.reduce((s, i) => s + i.qty * i.price, 0) - o.discount
  const at = isoDateTime(DEMO_TODAY)
  const rules = loyaltyOf(getData(), o.businessId)
  commit((d) => {
    let out = {
      ...d,
      orders: d.orders.map((x) => (x.folio === folio ? { ...x, status: 'cancelado' as const, refund: { amount, ref: `re_${o.paymentRef.slice(3, 15)}${Date.now().toString(36)}`, reason }, timeline: [...x.timeline, ['cancelado', at] as [OrderStatus, string]] } : x)),
      stock: { ...d.stock, [o.branchId]: { ...d.stock[o.branchId], ...Object.fromEntries(o.items.map((i) => [i.productId, (d.stock[o.branchId]?.[i.productId] ?? 0) + i.qty])) } },
      stockMoves: [...o.items.map((i, n) => ({ id: `mv-${folio}-c${n}`, branchId: o.branchId, productId: i.productId, on: at, change: i.qty, reason: `Pedido ${folio} cancelado` })), ...d.stockMoves],
    }
    out = withPoints(out, o.clientEmail, o.businessId, o.pointsUsed, `Te regresamos los puntos del pedido ${folio}`, `/pedido/${folio}`)
    out = withPoints(out, o.clientEmail, o.businessId, -Math.floor(amount / rules.pesosPerPointPurchases), `Pedido ${folio} cancelado`, `/pedido/${folio}`)
    return withNotification(out, o.clientEmail, 'pedido-cancelado', `${d.branches.find((b) => b.id === o.branchId)?.name ?? 'La sucursal'} canceló tu pedido ${folio}`, `Te reembolsamos $${amount} a tu tarjeta. ${reason}`, `/pedido/${folio}`)
  })
}

// RF-W24: the points rules of the business.
export function saveLoyalty(businessId: string, rules: LoyaltyRules, actor: Account | null) {
  requireBusiness(actor, businessId)
  commit((d) => ({ ...d, loyalty: { ...d.loyalty, [businessId]: rules } }))
}
