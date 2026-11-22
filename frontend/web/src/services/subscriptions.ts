// Demo implementation of plans, subscriptions and the businesses the
// Administrator oversees (RF-W25, RF-W27, RF-W28, RN-13, RN-17).
// Payments go through Stripe; SNIPP stores only the payment reference.
// In production the subscription is renewed with a Stripe PaymentIntent
// and confirmed by the webhook before the expiry date moves.
import { useSyncExternalStore } from 'react'
import { sessionAccount } from '@shared/auth'
import * as billing from '@shared/billing'
import { ApiError as SharedApiError, getData, subscribe as onDataChange } from '@shared/store'
import type { DemoData } from '@shared/types'
import { ApiError } from './auth'
import { getDemoEstado, takeForcedError } from './panel'
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
const day = (s: string) => new Date(`${s}T00:00`)

// Subscriptions the panel loaded with a state forced from the screen index
// (aviso, vencida...); they win over the shared data in this tab.
let forced: Record<string, Subscription> = {}
let sinPlanes = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  const off = onDataChange(l)
  return () => {
    listeners.delete(l)
    off()
  }
}

// RF-W27, RF-W28: plans and businesses as the Administrador sees them, from
// the data shared with the client app.
let cache: { data: DemoData; forced: typeof forced; sinPlanes: boolean; state: SubscriptionsState } | null = null
function snapshot(): SubscriptionsState {
  const data = getData()
  if (cache && cache.data === data && cache.forced === forced && cache.sinPlanes === sinPlanes) return cache.state
  const state: SubscriptionsState = {
    plans: sinPlanes ? [] : data.plans.map((p) => ({ ...p })),
    businesses: data.businesses.map((b): PlatformBusiness => {
      const owner = data.accounts.find((a) => a.role === 'jefe' && a.businessId === b.id)
      return {
        id: b.id,
        name: b.name,
        owner: owner?.name ?? '',
        email: owner?.email ?? '',
        branches: data.branches.filter((br) => br.businessId === b.id).length,
        joinedOn: day(b.joinedOn),
        suspended: b.suspended,
        subscription: forced[b.id] ?? { kind: b.subscription.kind, planId: b.subscription.planId, endsOn: day(b.subscription.endsOn) },
        payments: data.payments.filter((p) => p.businessId === b.id).map((p) => ({ id: p.id, on: day(p.on), planId: p.planId, amount: p.amount, ref: p.ref })),
      }
    }),
  }
  cache = { data, forced, sinPlanes, state }
  return state
}
export const useSubscriptionsStore = () => useSyncExternalStore(subscribe, snapshot, snapshot)
export const getPlans = () => snapshot().plans

// Screen index only. `forced` is the subscription the panel loaded for the
// signed-in business with the forced state (aviso, vencida...).
export function resetDemoSubscriptions(estado: string | null) {
  forced = {}
  sinPlanes = estado === 'sin-planes'
  emit()
}

// The panel may load a forced subscription state (screen index); keep it here.
export function applyLoadedSubscription(businessId: string, subscription: Subscription) {
  if (getDemoEstado() === null || forced[businessId]) return
  forced = { ...forced, [businessId]: subscription }
  emit()
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
  const paid = call(() => billing.paySubscription(businessId, planId, actor()))
  // Paying ends any state forced from the screen index.
  if (forced[businessId]) {
    const rest = { ...forced }
    delete rest[businessId]
    forced = rest
    emit()
  }
  return { endsOn: day(paid.endsOn), payment: { id: paid.id, on: day(paid.on), planId: paid.planId, amount: paid.amount, ref: paid.ref } }
}

// RF-W27: a plan created here appears as an option when a Jefe registers.
export async function savePlan(plan: Omit<Plan, 'id'> & { id?: string }) {
  await wait(600)
  failIfForced()
  call(() => billing.savePlan({ ...plan, offered: plan.offered ?? true }, actor()))
}

// RF-W28: a suspended business disappears from the app; its data is kept.
export async function setSuspended(businessId: string, suspended: boolean) {
  await wait(700)
  failIfForced()
  call(() => billing.setSuspended(businessId, suspended, actor()))
}
