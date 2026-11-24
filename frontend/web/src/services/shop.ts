// Demo implementation of the store API for the business (RF-W19 to RF-W21,
// RF-W24, RN-06, RN-07, RN-09) on the database shared with the client app
// (frontend/shared/catalog.ts and shop.ts): products and stock per branch,
// the orders the clients pay in the app, and the loyalty rules of each
// business. An order paid in the app shows up here at once, and marking it
// ready or cancelling it reaches the client's app.
// In production the refund is a Stripe Refund in test mode and the API
// stores only its reference (RN-17).
import { useSyncExternalStore } from 'react'
import { sessionAccount } from '@shared/auth'
import * as catalog from '@shared/catalog'
import { fromIsoDateTime } from '@shared/dates'
import * as sharedShop from '@shared/shop'
import { ApiError as SharedApiError, getData, subscribe as onDataChange } from '@shared/store'
import type { DemoData, Order as SharedOrder } from '@shared/types'
import { LIMITS, checkLabel, checkPrice, checkStock, checkText } from '@shared/validators'
import { ApiError } from './auth'
import { takeForcedError } from './panel'
import type { Status } from '../components/status'

// RF-W19, RF-W20: a product of one branch with its stock.
export interface Product {
  id: string
  sku: string
  branchId: string
  name: string
  size: string
  price: number
  photo: string | null
  description: string
  howTo: string
  stock: number
}
export type OrderStatus = 'pagado' | 'listo' | 'entregado' | 'cancelado'
export interface OrderLine { productId: string; name: string; qty: number; price: number }
// RF-W21, RN-06: paid in the app with Stripe; picked up at the branch.
export interface Order {
  folio: string
  businessId: string
  branchId: string
  client: string
  items: OrderLine[]
  pointsUsed: number
  discount?: number
  paymentRef: string
  status: OrderStatus
  refund?: { amount: number; ref: string; reason: string }
  timeline: [OrderStatus, Date][]
}
export interface StockMove { id: string; productId: string; on: Date; change: number; reason: string }
// RF-W24 / RN-09.
export interface LoyaltyRules { pesosPerPointAppointments: number; pesosPerPointPurchases: number; pesosPerPointRedeemed: number }
export interface ShopState { products: Product[]; orders: Order[]; moves: StockMove[]; loyalty: Record<string, LoyaltyRules> }
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// SRS v1.2, 4.2.2 "Pedidos de la sucursal": label, color and icon.
export const ORDER_STATE: Record<OrderStatus, Status> = {
  pagado: { label: 'Pagado · preparar', color: 'verde', icon: 'check' },
  listo: { label: 'Listo para recoger', color: 'azul', icon: 'bolsa' },
  entregado: { label: 'Entregado', color: 'gris', icon: 'check' },
  cancelado: { label: 'Cancelado · reembolsado', color: 'rojo', icon: 'cancelada' },
}
// What the client sees in "Mis pedidos" (same texts as the app, SRS v1.2 4.2.1).
export const CLIENT_ORDER_STATE: Record<OrderStatus, string> = { pagado: 'Pagado · en preparación', listo: 'Listo para recoger', entregado: 'Entregado', cancelado: 'Cancelado · reembolsado' }
// The next step of each state; any order not delivered yet can be cancelled.
export const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { pagado: 'listo', listo: 'entregado' }

// A product of a branch is "branchId:productId" in the panel.
const productKey = (branchId: string, productId: string) => `${branchId}:${productId}`
const splitKey = (key: string) => {
  const i = key.indexOf(':')
  return { branchId: key.slice(0, i), productId: key.slice(i + 1) }
}

const panelOrders = new WeakMap<SharedOrder, Order>()
function toPanelOrder(o: SharedOrder): Order {
  let out = panelOrders.get(o)
  if (!out) {
    out = {
      folio: o.folio, businessId: o.businessId, branchId: o.branchId, client: o.clientName,
      items: o.items.map((i) => ({ ...i, productId: productKey(o.branchId, i.productId) })),
      pointsUsed: o.pointsUsed, ...(o.discount ? { discount: o.discount } : {}), paymentRef: o.paymentRef, status: o.status,
      ...(o.refund ? { refund: o.refund } : {}),
      timeline: o.timeline.map(([st, at]) => [st, fromIsoDateTime(at)] as [OrderStatus, Date]),
    }
    panelOrders.set(o, out)
  }
  return out
}

// Screen index only: a branch without products or without orders.
let empty: { products: boolean; orders: boolean } = { products: false, orders: false }
let cache: { data: DemoData; empty: typeof empty; state: ShopState } | null = null
function snapshot(): ShopState {
  const data = getData()
  if (cache && cache.data === data && cache.empty === empty) return cache.state
  const products = empty.products ? [] : Object.entries(data.stock).flatMap(([branchId, list]) =>
    Object.entries(list).flatMap(([sku, stock]): Product[] => {
      const p = data.products.find((x) => x.id === sku)
      return p ? [{ id: productKey(branchId, sku), sku, branchId, name: p.name, size: p.size, price: p.price, photo: p.photo, description: p.description, howTo: p.howTo, stock }] : []
    }),
  )
  const state: ShopState = {
    products,
    orders: empty.orders ? [] : data.orders.map(toPanelOrder),
    moves: empty.products ? [] : data.stockMoves.map((m) => ({ id: m.id, productId: productKey(m.branchId, m.productId), on: fromIsoDateTime(m.on), change: m.change, reason: m.reason })),
    loyalty: data.loyalty,
  }
  cache = { data, empty, state }
  return state
}
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  const off = onDataChange(l)
  return () => {
    listeners.delete(l)
    off()
  }
}
export const useShopStore = () => useSyncExternalStore(subscribe, snapshot, snapshot)
export const getShopStore = snapshot

export function resetDemoShop(estado: string | null) {
  empty = { products: estado === 'sin-productos', orders: estado === 'sin-pedidos' }
  listeners.forEach((l) => l())
}
function failIfForced() {
  const e = takeForcedError('error-guardar', 'error-stripe')
  if (e === 'error-guardar') throw new ApiError('server')
  if (e === 'error-stripe') throw new ApiError('stripe')
}
// The shared store answers with a code and a message; the panel shows it.
function call<T>(fn: () => T): T {
  try {
    return fn()
  } catch (err) {
    if (err instanceof SharedApiError) throw new ApiError(err.code === 'not-found' ? 'invalid' : (err.code as 'invalid' | 'conflict' | 'forbidden'), err.message)
    throw err
  }
}
const actor = () => sessionAccount('panel')

// discount: pesos taken off with points, fixed when the order was paid.
export const orderTotal = (o: Pick<Order, 'items' | 'discount'>) => o.items.reduce((s, it) => s + it.qty * it.price, 0) - (o.discount ?? 0)
export const productLabel = (p: Pick<Product, 'name' | 'size'>) => (p.size ? `${p.name} ${p.size}` : p.name)
export const loyaltyFor = (s: ShopState, businessId: string): LoyaltyRules => s.loyalty[businessId] ?? { pesosPerPointAppointments: 10, pesosPerPointPurchases: 10, pesosPerPointRedeemed: 1 }

// ---------- Products and stock (RF-W19, RF-W20) ----------

export type ProductForm = Omit<Product, 'id' | 'sku' | 'branchId'> & { id?: string; sku?: string; branchId?: string }
// The same checks as the form, again here (RF-W19): a request sent without
// the screen is rejected too.
function check(...messages: (string | null)[]) {
  const first = messages.find(Boolean)
  if (first) throw new ApiError('invalid', first)
}

export async function saveProduct(branchId: string, data: ProductForm): Promise<Product> {
  await wait(700)
  failIfForced()
  check(
    checkLabel(String(data.name ?? ''), LIMITS.productName, 'Escribe el nombre del producto.'),
    checkText(String(data.size ?? ''), LIMITS.size),
    checkPrice(data.price),
    checkStock(data.stock),
    checkText(String(data.description ?? ''), LIMITS.description),
    checkText(String(data.howTo ?? ''), LIMITS.description),
  )
  const sku = data.sku ?? (data.id ? splitKey(data.id).productId : undefined)
  const saved = call(() => catalog.saveProduct(branchId, { id: sku, name: data.name, size: data.size, price: data.price, description: data.description, howTo: data.howTo, photo: data.photo, stock: data.stock }, actor()))
  return snapshot().products.find((p) => p.id === productKey(branchId, saved.id)) as Product
}

export async function adjustStock(productId: string, newStock: number, reason: string) {
  await wait(600)
  failIfForced()
  check(checkStock(newStock), checkText(String(reason ?? ''), LIMITS.reason, 'Escribe el motivo del ajuste.'))
  const { branchId, productId: sku } = splitKey(productId)
  call(() => catalog.adjustStock(branchId, sku, newStock, reason, actor()))
}

// ---------- Orders (RF-W21, RN-06) ----------

// The client is told when the order is ready to pick up (RF-M16).
export async function advanceOrder(folio: string) {
  await wait(600)
  failIfForced()
  call(() => sharedShop.advanceOrder(folio, actor()))
}

// A paid order that is cancelled is refunded with Stripe (RN-06). The
// pieces go back to the branch stock, since they were never picked up.
export async function cancelOrder(folio: string, reason: string) {
  await wait(1000)
  failIfForced()
  check(checkText(String(reason ?? ''), LIMITS.reason, 'Escribe el motivo de la cancelación.'))
  call(() => sharedShop.cancelOrder(folio, reason.trim(), actor()))
}

// ---------- Loyalty (RF-W24) ----------

export async function saveLoyalty(businessId: string, rules: LoyaltyRules) {
  await wait(700)
  failIfForced()
  const values = [rules.pesosPerPointAppointments, rules.pesosPerPointPurchases, rules.pesosPerPointRedeemed]
  if (!values.every((n) => Number.isInteger(n) && n >= 1 && n <= 1000)) throw new ApiError('invalid', 'Usa números enteros de 1 a 1,000.')
  call(() => sharedShop.saveLoyalty(businessId, rules, actor()))
}
