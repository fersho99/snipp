// Sample data for the web panel. Businesses, branches, services, Empleados
// and products come from the data shared with the client app
// (frontend/shared/seed.ts); here only what the panel adds to them.
// "Today" is Thursday 12 November 2026.
import { DEMO_TODAY } from '@shared/dates'
import { accounts as sharedAccounts, branches as sharedBranches, businesses as sharedBusinesses, employees as sharedEmployees, products as sharedProducts, services as sharedServices } from '@shared/seed'
import type { Branch, Business, Employee, Plan, Role, Session } from '../types/domain'

export { DEMO_TODAY }

const interior = '/photos/barberia-interior.jpg'
const fade = '/photos/trabajo-fade.jpg'

// Subscription plans the Administrator manages (RF-W27). A plan created
// there shows up here as an option when a Jefe registers. Prices are examples.
export const plans: Plan[] = [
  { id: 'mensual', name: 'Mensual', price: 499, months: 1 },
  { id: 'semestral', name: 'Semestral', price: 2694, months: 6 },
  { id: 'anual', name: 'Anual', price: 4990, months: 12 },
]

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

// A branch as the panel manages it (RF-W05 to RF-W09). Inactive services
// are not offered in the app (RN-14).
function panelBranch(id: string): Branch {
  const b = sharedBranches.find((x) => x.id === id)
  if (!b) throw new Error(`Missing branch ${id}`)
  return {
    id: b.id,
    name: b.name,
    address: `${b.address}, ${b.neighborhood}`,
    phone: b.phone,
    description: b.description,
    hours: b.hours.map((h) => (h ? [h[0], h[1]] : null)),
    active: true,
    services: sharedServices.filter((x) => b.serviceIds.includes(x.id)).map((x) => ({ ...x, active: true })),
    ...(PANEL_EXTRAS[id] ?? { images: [], coverId: null, upcoming: 0 }),
  }
}

// Businesses with their branches, settings and subscription (RF-W05 to
// RF-W09, RF-W25, RN-13).
// minNoticeHours: how long before an appointment clients can still cancel
// or reschedule in the app (RF-W08, 2 hours by default).
// subscription.kind: 'prueba' (free first month) or 'pagada' (a paid plan).
// endsOn is the last day covered; after it, without payment, it is overdue.
export const businesses: Record<string, Business> = Object.fromEntries(
  sharedBusinesses.map((b): [string, Business] => [
    b.id,
    {
      id: b.id,
      name: b.name,
      minNoticeHours: 2,
      branches: sharedBranches.filter((br) => br.businessId === b.id).map((br) => panelBranch(br.id)),
      subscription: { kind: b.subscription.kind, planId: b.subscription.planId, endsOn: new Date(`${b.subscription.endsOn}T00:00`) },
    },
  ]),
)

// Empleados linked to each branch (RF-W10).
export const employees: Employee[] = sharedEmployees
  .filter((e) => e.businessId === 'los-compas')
  .map(({ id, name, specialty, businessId, branchId, bookable }) => ({ id, name, specialty, businessId, branchId, bookable }))

// Store products of each branch (RF-W19). Same catalog as the mobile app.
export const products = sharedProducts.map((p) => ({ id: p.id, name: p.size ? `${p.name} ${p.size}` : p.name, price: p.price }))
export const branchProducts: Record<string, string[]> = {
  'los-compas-centro': ['pomada', 'aceite', 'shampoo', 'cera'],
  'los-compas-norte': ['pomada', 'cera'],
}

// Requests waiting for the Jefe: to join a branch (RF-W10) or to migrate
// from another business (RF-W12). Unanswered, they expire after 7 days (RN-11).
export interface JoinRequest { id: string; businessId: string; kind: 'ingreso' | 'migracion'; name: string; email: string; branchId: string; from?: string; sentOn: Date }
export const pendingRequests: JoinRequest[] = [
  { id: 'S-31', businessId: 'los-compas', kind: 'ingreso', name: 'Sofía Ramos', email: 'sofia.ramos@gmail.com', branchId: 'los-compas-centro', sentOn: new Date(2026, 10, 10) },
  { id: 'S-32', businessId: 'los-compas', kind: 'migracion', name: 'Diego Armenta', email: 'diego.armenta@gmail.com', from: 'Barbería El Faro', branchId: 'los-compas-norte', sentOn: new Date(2026, 10, 6) },
]

// Demo accounts of the panel (RF-W04). Their password is in frontend/README.md.
export const accounts: Session[] = sharedAccounts
  .filter((a) => a.role !== 'cliente')
  .map(({ email, name, role, businessId, branchId }) => ({ email, name, role: role as Role, businessId, ...(branchId ? { branchId } : {}) }))

export const ROLE_LABEL: Record<Role, string> = { admin: 'Administrador de SNIPP', jefe: 'Jefe', empleado: 'Empleado' }
