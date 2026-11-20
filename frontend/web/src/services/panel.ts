// Demo implementation of what the panel loads after sign-in: the business,
// its branches and its subscription (RF-W04, RF-W05, RF-W25, RF-W26, RN-13).
// In production this is one call to the API, filtered by the role and the
// business of the signed-in user (RNF-W04).
import { businesses, DEMO_TODAY } from '../data/demo'
import { ApiError, logout } from './auth'
import type { Business, Session, Subscription, SubscriptionStatus } from '../types/domain'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const DAY = 24 * 60 * 60 * 1000

// States the screen index can force. They stay while moving inside the panel
// and are cleared when the session closes.
//   aviso-prueba       the free month ends in 7 days
//   aviso-suscripcion  the paid plan ends in 7 days
//   vencida            the subscription ended without payment
//   sin-sucursales     the Jefe has not registered any branch yet
//   cargando | sin-conexion | error-servidor
let demoEstado: string | null = null
export const setDemoEstado = (estado: string | null) => { demoEstado = estado }
export const getDemoEstado = () => demoEstado
// A forced save error (?estado=error-guardar and similar) fails only once, so
// "Reintentar" can be tried and goes through (SRS v1.2, 4.2).
export function takeForcedError(...estados: string[]) {
  if (!demoEstado || !estados.includes(demoEstado)) return null
  const e = demoEstado
  demoEstado = null
  return e
}

// Branch picked in the Jefe's selector, kept while the session lasts.
let pickedBranch: string | null = null
export const getPickedBranch = () => pickedBranch
export const setPickedBranch = (id: string) => { pickedBranch = id }

export function signOut() {
  demoEstado = null
  pickedBranch = null
  logout()
}

const atDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const daysFrom = (n: number) => new Date(DEMO_TODAY.getFullYear(), DEMO_TODAY.getMonth(), DEMO_TODAY.getDate() + n)

function subscriptionFor(base: Omit<Subscription, 'endsOn'> & { endsOn: Date | string }): Subscription {
  if (demoEstado === 'aviso-prueba') return { kind: 'prueba', planId: base.planId, endsOn: daysFrom(7) }
  if (demoEstado === 'aviso-suscripcion') return { kind: 'pagada', planId: base.planId ?? 'mensual', endsOn: daysFrom(7) }
  if (demoEstado === 'vencida') return { kind: 'pagada', planId: base.planId ?? 'mensual', endsOn: daysFrom(-2) }
  return { ...base, endsOn: new Date(base.endsOn) }
}

export async function loadPanel(session: Session): Promise<{ business: Business | null }> {
  if (demoEstado === 'cargando') return new Promise(() => {})
  await wait(500)
  if (demoEstado === 'sin-conexion') throw new ApiError('offline')
  if (demoEstado === 'error-servidor') throw new ApiError('server')
  if (!session.businessId) return { business: null }

  const stored = businesses[session.businessId] ?? session.business
  if (!stored) throw new ApiError('server')
  const business: Business = {
    ...stored,
    branches: demoEstado === 'sin-sucursales' ? [] : stored.branches,
    subscription: subscriptionFor(stored.subscription),
  }
  return { business }
}

// Where the subscription stands today (RF-W25, RF-W26, RN-13):
//   { status: 'al-dia' }                       more than 7 days left
//   { status: 'por-vencer', daysLeft }         7 days or fewer: notice for the Jefe
//   { status: 'vencida' }                      ended without payment
export function subscriptionStatus(subscription: Subscription): SubscriptionStatus {
  const daysLeft = Math.round((atDay(subscription.endsOn).getTime() - atDay(DEMO_TODAY).getTime()) / DAY)
  if (daysLeft < 0) return { status: 'vencida', daysLeft }
  if (daysLeft <= 7) return { status: 'por-vencer', daysLeft }
  return { status: 'al-dia', daysLeft }
}
