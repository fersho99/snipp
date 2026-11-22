// Sample data for the web panel. Businesses, branches, services, Empleados
// and products live in the database shared with the client app
// (frontend/shared/store.ts); here only what the panel adds to them, and
// the functions that give them the shape the panel uses.
// "Today" is Thursday 12 November 2026.
import { DEMO_TODAY, iso } from '@shared/dates'
import { accounts as sharedAccounts } from '@shared/seed'
import { getData } from '@shared/store'
import type { Branch as SharedBranch, DemoData } from '@shared/types'
import type { Branch, Business, Plan, Role, Session } from '../types/domain'

export { DEMO_TODAY }

const interior = '/photos/barberia-interior.jpg'
const fade = '/photos/trabajo-fade.jpg'

// Subscription plans the Administrator manages (RF-W27). A plan created
// there shows up here as an option when a Jefe registers. Prices are examples.
export const plans = (): Plan[] => getData().plans.filter((p) => p.offered).map(({ id, name, price, months }) => ({ id, name, price, months }))

// Photos of each branch and the appointments already booked from today on
// (shown before deactivating).
const PANEL_EXTRAS: Record<string, Pick<Branch, 'images' | 'coverId' | 'upcoming'>> = {
  'los-compas-centro': {
    images: [
      { id: 'img-1', src: interior, name: 'barberia-interior.jpg' },
      { id: 'img-2', src: fade, name: 'trabajo-fade.jpg' },
    ],
    coverId: 'img-1',
    upcoming: 23,
  },
  'los-compas-norte': {
    images: [
      { id: 'img-3', src: fade, name: 'trabajo-fade.jpg' },
      { id: 'img-4', src: interior, name: 'barberia-interior.jpg' },
    ],
    coverId: 'img-3',
    upcoming: 9,
  },
}

// A shared branch as the panel manages it (RF-W05 to RF-W09). Inactive
// services are not offered in the app (RN-14). The photos uploaded in this
// tab stay here: they are files of this browser and do not fit in storage.
const panelBranches = new WeakMap<SharedBranch, Branch>()
export function panelBranch(d: DemoData, b: SharedBranch): Branch {
  let out = panelBranches.get(b)
  if (!out) {
    const today = iso(DEMO_TODAY)
    out = {
      id: b.id,
      name: b.name,
      address: b.neighborhood ? `${b.address}, ${b.neighborhood}` : b.address,
      phone: b.phone,
      description: b.description,
      hours: b.hours.map((h) => (h ? [h[0], h[1]] : null)),
      active: b.active,
      services: d.services.filter((x) => b.serviceIds.includes(x.id)).map((x) => ({ ...x, active: !b.inactiveServiceIds.includes(x.id) })),
      ...(PANEL_EXTRAS[b.id] ?? { images: [], coverId: null }),
      upcoming: d.appointments.filter((a) => a.branchId === b.id && a.date >= today && (a.status === 'confirmada' || a.status === 'cambio')).length,
    }
    panelBranches.set(b, out)
  }
  return out
}

// A business with its branches, settings and subscription (RF-W05 to
// RF-W09, RF-W25, RN-13), as it is now in the shared data.
// minNoticeHours: how long before an appointment clients can still cancel
// or reschedule in the app (RF-W08, 2 hours by default).
// subscription.kind: 'prueba' (free first month) or 'pagada' (a paid plan).
// endsOn is the last day covered; after it, without payment, it is overdue.
export function panelBusiness(id: string): Business | null {
  const d = getData()
  const b = d.businesses.find((x) => x.id === id)
  if (!b) return null
  return {
    id: b.id,
    name: b.name,
    minNoticeHours: b.minNoticeHours,
    branches: d.branches.filter((br) => br.businessId === b.id).map((br) => panelBranch(d, br)),
    subscription: { kind: b.subscription.kind, planId: b.subscription.planId, endsOn: new Date(`${b.subscription.endsOn}T00:00`) },
  }
}

// A request waiting for the Jefe: to join a branch (RF-W10) or to migrate
// from another business (RF-W12). Unanswered, it expires after 7 days (RN-11).
// The requests themselves are in the shared data.
export interface JoinRequest { id: string; businessId: string; kind: 'ingreso' | 'migracion'; name: string; email: string; branchId: string; from?: string; sentOn: Date }

// Demo accounts of the panel (RF-W04). Their password is in frontend/README.md.
export const accounts: Session[] = sharedAccounts
  .filter((a) => a.role !== 'cliente')
  .map(({ email, name, role, businessId, branchId }) => ({ email, name, role: role as Role, businessId, ...(branchId ? { branchId } : {}) }))

export const ROLE_LABEL: Record<Role, string> = { admin: 'Administrador de SNIPP', jefe: 'Jefe', empleado: 'Empleado' }
