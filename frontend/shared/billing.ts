// Plans and subscriptions (RF-W25 to RF-W28, RN-13, RN-17). A business
// whose subscription ran out, or that the Administrador suspended, leaves
// the app at once; paying or reactivating brings it back at once too.
import { DEMO_TODAY, fromIso, iso } from './dates'
import { ApiError, commit, getData } from './store'
import type { Account, Plan, SubscriptionPayment } from './types'

const requireAdmin = (actor: Account | null) => {
  if (!actor || actor.role !== 'admin') throw new ApiError('forbidden', 'Solo el Administrador hace este cambio.')
}

// RF-W25: paying extends the subscription by the plan's months, from its
// end or from today if it already ended.
export function paySubscription(businessId: string, planId: string, actor: Account | null): SubscriptionPayment & { endsOn: string } {
  if (!actor || actor.role !== 'jefe' || actor.businessId !== businessId) throw new ApiError('forbidden', 'Solo el Jefe paga la suscripción de su negocio.')
  const d = getData()
  const plan = d.plans.find((p) => p.id === planId && p.offered)
  const business = d.businesses.find((b) => b.id === businessId)
  if (!plan || !business) throw new ApiError('not-found', 'Ese plan ya no está disponible.')
  const end = fromIso(business.subscription.endsOn)
  const from = end < DEMO_TODAY ? DEMO_TODAY : end
  const endsOn = iso(new Date(from.getFullYear(), from.getMonth() + plan.months, from.getDate()))
  const payment: SubscriptionPayment = { id: `pay-${Date.now()}`, businessId, on: iso(DEMO_TODAY), planId, amount: plan.price, ref: `pi_3QK${Date.now().toString(36)}2eZvKYlo2C` }
  commit((x) => ({
    ...x,
    payments: [payment, ...x.payments],
    businesses: x.businesses.map((b) => (b.id === businessId ? { ...b, subscription: { kind: 'pagada', planId, endsOn } } : b)),
  }))
  return { ...payment, endsOn }
}

// RF-W27: a new plan appears when a Jefe registers or pays.
// RF-W27: a plan can be created and edited (name, price and duration) but
// never retired, so it is always offered.
export function savePlan(input: Pick<Plan, 'name' | 'price' | 'months'> & { id?: string }, actor: Account | null) {
  requireAdmin(actor)
  const plan = { name: input.name, price: input.price, months: input.months, offered: true }
  commit((d) => {
    if (input.id && d.plans.some((p) => p.id === input.id)) return { ...d, plans: d.plans.map((p) => (p.id === input.id ? { ...p, ...plan } : p)) }
    const base = plan.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')
    const id = d.plans.some((p) => p.id === base) ? `${base}-${Date.now()}` : base
    return { ...d, plans: [...d.plans, { ...plan, id }] }
  })
}

// RF-W28: a suspended business disappears from the app; its data is kept.
export function setSuspended(businessId: string, suspended: boolean, actor: Account | null) {
  requireAdmin(actor)
  commit((d) => ({ ...d, businesses: d.businesses.map((b) => (b.id === businessId ? { ...b, suspended } : b)) }))
}
