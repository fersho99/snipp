// Demo implementation of plans, subscriptions and the businesses the
// Administrator oversees (RF-W25, RF-W27, RF-W28, RN-13, RN-17).
// Payments go through Stripe; SNIPP stores only the payment reference.
// In production the subscription is renewed with a Stripe PaymentIntent
// and confirmed by the webhook before the expiry date moves.
import { useSyncExternalStore } from 'react'
import { DEMO_TODAY, plans as seedPlans } from '../data/demo'
import { addMonths } from '../theme'
import { ApiError } from './auth'
import { takeForcedError } from './panel'
import type { Plan, Subscription } from '../types/domain'

export interface Payment { id: string; on: Date; planId: string; amount: number; ref: string }
// RF-W27, RF-W28: a business as the Administrator sees it.
export interface PlatformBusiness {
  id: string
  name: string
  owner: string
  email: string
  branches: number
  joinedOn: Date
  suspended: boolean
  subscription: Subscription
  payments: Payment[]
}
export interface SubscriptionsState { plans: Plan[]; businesses: PlatformBusiness[] }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const d = (m: number, day: number, y = 2026) => new Date(y, m - 1, day)

function seedBusinesses(): PlatformBusiness[] {
  return [
    {
      id: 'los-compas', name: 'Barbería Los Compas', owner: 'Martín Salazar', email: 'martin.salazar@loscompas.mx', branches: 2, joinedOn: d(8, 3), suspended: false,
      subscription: { kind: 'pagada', planId: 'mensual', endsOn: d(12, 3) },
      payments: [
        { id: 'pay-3', on: d(11, 3), planId: 'mensual', amount: 499, ref: 'pi_3QGv1x2eZvKYlo2C1mKp8sRt' },
        { id: 'pay-2', on: d(10, 3), planId: 'mensual', amount: 499, ref: 'pi_3Q5aLc2eZvKYlo2C0yUj4nVb' },
        { id: 'pay-1', on: d(9, 3), planId: 'mensual', amount: 499, ref: 'pi_3PuQe82eZvKYlo2C1dWq2hZx' },
      ],
    },
    {
      id: 'estudio-marisol', name: 'Estudio Marisol', owner: 'Marisol Peña', email: 'marisol@estudiomarisol.mx', branches: 1, joinedOn: d(8, 12), suspended: false,
      subscription: { kind: 'pagada', planId: 'anual', endsOn: d(3, 12, 2027) },
      payments: [{ id: 'pay-m1', on: d(9, 12), planId: 'anual', amount: 4990, ref: 'pi_3PyZt12eZvKYlo2C0rJk7mQa' }],
    },
    {
      id: 'navaja-fina', name: 'Navaja Fina', owner: 'Armando Ruiz', email: 'armando@navajafina.mx', branches: 1, joinedOn: d(10, 25), suspended: false,
      subscription: { kind: 'prueba', planId: 'mensual', endsOn: d(11, 25) },
      payments: [],
    },
    {
      id: 'el-faro', name: 'Barbería El Faro', owner: 'Rogelio Tapia', email: 'rogelio@elfaro.mx', branches: 1, joinedOn: d(9, 5), suspended: false,
      subscription: { kind: 'pagada', planId: 'mensual', endsOn: d(11, 5) },
      payments: [{ id: 'pay-f1', on: d(10, 5), planId: 'mensual', amount: 499, ref: 'pi_3Q6bWn2eZvKYlo2C1pLs9tUv' }],
    },
    {
      id: 'unas-coral', name: 'Uñas Coral', owner: 'Karen Lugo', email: 'karen@unascoral.mx', branches: 1, joinedOn: d(9, 20), suspended: true,
      subscription: { kind: 'pagada', planId: 'semestral', endsOn: d(3, 20, 2027) },
      payments: [{ id: 'pay-c1', on: d(10, 20), planId: 'semestral', amount: 2694, ref: 'pi_3QBdKp2eZvKYlo2C0aTq5wYz' }],
    },
  ]
}

function seed(): SubscriptionsState {
  return { plans: seedPlans.map((p) => ({ ...p, offered: true })), businesses: seedBusinesses() }
}

let state = seed()
let applied = new Set<string>()
const listeners = new Set<() => void>()
const set = (fn: (s: SubscriptionsState) => SubscriptionsState) => {
  state = fn(state)
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const useSubscriptionsStore = () => useSyncExternalStore(subscribe, () => state)
export const getPlans = () => state.plans

// Screen index only. `forced` is the subscription the panel loaded for the
// signed-in business with the forced state (aviso, vencida...).
export function resetDemoSubscriptions(estado: string | null) {
  state = seed()
  applied = new Set()
  if (estado === 'sin-planes') state = { ...state, plans: [] }
}

// The signed-in business: from the list, or the one registered in this session.
export function ensureBusiness(business: { id: string; name: string; branches?: unknown[]; subscription: Subscription } | null) {
  if (!business || state.businesses.some((b) => b.id === business.id)) return
  state = {
    ...state,
    businesses: [...state.businesses, { id: business.id, name: business.name, owner: '', email: '', branches: business.branches?.length ?? 0, joinedOn: DEMO_TODAY, suspended: false, subscription: business.subscription, payments: [] }],
  }
  listeners.forEach((l) => l())
}
// The panel may load a forced subscription state (screen index); keep it here.
export function applyLoadedSubscription(businessId: string, subscription: Subscription) {
  if (applied.has(businessId)) return
  applied.add(businessId)
  state = { ...state, businesses: state.businesses.map((b) => (b.id === businessId ? { ...b, subscription } : b)) }
  listeners.forEach((l) => l())
}

function failIfForced(codes: string[] = []) {
  const e = takeForcedError('error-guardar', ...(codes.includes('card') ? ['error-pago'] : []))
  if (e === 'error-guardar') throw new ApiError('server')
  if (e === 'error-pago') throw new ApiError('card')
}

// RF-W25: paying extends the expiry by the plan's months, counted from the
// current expiry or from today if it already passed. An overdue business is
// shown again in the app right away (RN-13).
export interface PaymentResult { endsOn: Date; payment: Payment }
export async function paySubscription(businessId: string, planId: string): Promise<PaymentResult> {
  await wait(1200)
  failIfForced(['card'])
  let result: PaymentResult | null = null
  set((s) => {
    const plan = s.plans.find((p) => p.id === planId)
    if (!plan) return s
    return {
      ...s,
      businesses: s.businesses.map((b) => {
        if (b.id !== businessId) return b
        const from = b.subscription.endsOn < DEMO_TODAY ? DEMO_TODAY : b.subscription.endsOn
        const endsOn = addMonths(from, plan.months)
        const payment = { id: `pay-${Date.now()}`, on: DEMO_TODAY, planId, amount: plan.price, ref: `pi_3QK${Date.now().toString(36)}2eZvKYlo2C` }
        result = { endsOn, payment }
        return { ...b, subscription: { kind: 'pagada' as const, planId, endsOn }, payments: [payment, ...b.payments] }
      }),
    }
  })
  if (!result) throw new ApiError('server')
  return result
}

// RF-W27: a plan created here appears as an option when a Jefe registers.
export async function savePlan(plan: Omit<Plan, 'id'> & { id?: string }) {
  await wait(600)
  failIfForced()
  set((s) => {
    if (plan.id) return { ...s, plans: s.plans.map((p) => (p.id === plan.id ? { ...plan, id: p.id } : p)) }
    const id = plan.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')
    return { ...s, plans: [...s.plans, { ...plan, id: s.plans.some((p) => p.id === id) ? `${id}-${Date.now()}` : id }] }
  })
}

// RF-W28: a suspended business disappears from the app; its data is kept.
export async function setSuspended(businessId: string, suspended: boolean) {
  await wait(700)
  failIfForced()
  set((s) => ({ ...s, businesses: s.businesses.map((b) => (b.id === businessId ? { ...b, suspended } : b)) }))
}
