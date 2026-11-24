// What the Jefe registers in the panel and the app shows (RF-W05 to RF-W13,
// RF-W19, RF-W20): business settings, branches, services, products and
// stock, Empleados, requests and invitations. Every function checks that
// the signed-in account may do it (RNF-W04) and saves to the shared data,
// so the client app sees the change right away.
import { DEMO_TODAY, iso, isoDateTime } from './dates'
import { ApiError, commit, getData } from './store'
import type { Account, Branch, DemoData, Employee, Product, Service, WeekHours } from './types'

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
let counter = 0
const unique = (base: string, taken: string[]) => {
  let id = base || `id-${(counter += 1)}`
  while (taken.includes(id)) id = `${base}-${(counter += 1)}`
  return id
}

// The Jefe of that business (or, where it says so, one of its Empleados).
export function requireBusiness(actor: Account | null, businessId: string, alsoEmpleado = false) {
  const ok = !!actor && actor.businessId === businessId && (actor.role === 'jefe' || (alsoEmpleado && actor.role === 'empleado'))
  if (!ok) throw new ApiError('forbidden', 'Tu cuenta no puede cambiar datos de este negocio.')
}
const branchOf = (d: DemoData, branchId: string) => {
  const b = d.branches.find((x) => x.id === branchId)
  if (!b) throw new ApiError('not-found', 'Esa sucursal no existe.')
  return b
}

// ---------------------------------------------------------------- business

export function saveMinNotice(businessId: string, hours: number, actor: Account | null) {
  requireBusiness(actor, businessId)
  if (!Number.isInteger(hours) || hours < 0 || hours > 168) throw new ApiError('invalid', 'Escribe un número entero de horas, de 0 a 168.')
  commit((d) => ({ ...d, businesses: d.businesses.map((b) => (b.id === businessId ? { ...b, minNoticeHours: hours } : b)) }))
}

// ---------------------------------------------------------------- branches

export type BranchInput = Pick<Branch, 'name' | 'address' | 'neighborhood' | 'phone' | 'description' | 'hours'>

// RF-W05: a new branch starts active, without services; the Jefe adds them next.
export function createBranch(businessId: string, input: BranchInput, actor: Account | null): Branch {
  requireBusiness(actor, businessId)
  const d = getData()
  const branch: Branch = { ...input, id: unique(slug(input.name), d.branches.map((b) => b.id)), businessId, serviceIds: [], active: true, inactiveServiceIds: [] }
  commit((x) => ({ ...x, branches: [...x.branches, branch] }))
  return branch
}

export function updateBranch(branchId: string, patch: Partial<BranchInput>, actor: Account | null) {
  const b = branchOf(getData(), branchId)
  requireBusiness(actor, b.businessId)
  const allowed: Partial<BranchInput> = {}
  for (const k of ['name', 'address', 'neighborhood', 'phone', 'description', 'hours'] as const) if (patch[k] !== undefined) (allowed as Record<string, unknown>)[k] = patch[k]
  commit((d) => ({ ...d, branches: d.branches.map((x) => (x.id === branchId ? { ...x, ...allowed } : x)) }))
}

// RF-W09, RN-14: deactivating hides the branch in the app; nothing is deleted.
export function setBranchActive(branchId: string, active: boolean, actor: Account | null) {
  const b = branchOf(getData(), branchId)
  requireBusiness(actor, b.businessId)
  commit((d) => ({ ...d, branches: d.branches.map((x) => (x.id === branchId ? { ...x, active } : x)) }))
}

// ---------------------------------------------------------------- services

export type ServiceInput = Omit<Service, 'id'> & { id?: string; active: boolean }

// RF-W06, RF-W07. Several branches can offer the same service; a change of
// one branch gives that branch its own copy so the others stay as they were.
// A new service is offered by every bookable Empleado of the branch.
export function saveService(branchId: string, input: ServiceInput, actor: Account | null): Service {
  const d = getData()
  const branch = branchOf(d, branchId)
  requireBusiness(actor, branch.businessId)
  const fields = { name: input.name.trim(), description: input.description.trim(), minutes: input.minutes, price: input.price }
  const current = input.id ? d.services.find((s) => s.id === input.id) : undefined
  let service: Service
  let next: DemoData = d
  if (!current) {
    service = { id: unique(slug(fields.name), d.services.map((s) => s.id)), ...fields }
    next = {
      ...d,
      services: [...d.services, service],
      branches: d.branches.map((b) => (b.id === branchId ? { ...b, serviceIds: [...b.serviceIds, service.id] } : b)),
      employees: d.employees.map((e) => (e.branchId === branchId && e.bookable ? { ...e, serviceIds: [...e.serviceIds, service.id] } : e)),
    }
  } else {
    const changed = (Object.keys(fields) as (keyof typeof fields)[]).some((k) => fields[k] !== current[k])
    const shared = d.branches.some((b) => b.id !== branchId && b.serviceIds.includes(current.id))
    if (changed && shared) {
      service = { id: unique(`${current.id}-${branchId}`, d.services.map((s) => s.id)), ...fields }
      const swap = (ids: string[]) => ids.map((id) => (id === current.id ? service.id : id))
      next = {
        ...d,
        services: [...d.services, service],
        branches: d.branches.map((b) => (b.id === branchId ? { ...b, serviceIds: swap(b.serviceIds), inactiveServiceIds: swap(b.inactiveServiceIds) } : b)),
        employees: d.employees.map((e) => (e.branchId === branchId ? { ...e, serviceIds: swap(e.serviceIds) } : e)),
      }
    } else {
      service = { ...current, ...fields }
      next = { ...d, services: d.services.map((s) => (s.id === current.id ? service : s)) }
    }
  }
  // RN-14: an inactive service is not offered in the app.
  next = {
    ...next,
    branches: next.branches.map((b) => {
      if (b.id !== branchId) return b
      const rest = b.inactiveServiceIds.filter((id) => id !== service.id)
      return { ...b, inactiveServiceIds: input.active ? rest : [...rest, service.id] }
    }),
  }
  commit(() => next)
  return service
}

// ---------------------------------------------------------------- products

export type ProductInput = Omit<Product, 'id'> & { id?: string; stock?: number }

// RF-W19: the products of a branch. Like services, a product sold in other
// branches gets its own copy when this branch changes it.
export function saveProduct(branchId: string, input: ProductInput, actor: Account | null): Product {
  const d = getData()
  const branch = branchOf(d, branchId)
  requireBusiness(actor, branch.businessId)
  const fields = { name: input.name.trim(), size: input.size.trim(), price: input.price, description: input.description.trim(), howTo: input.howTo.trim(), photo: input.photo }
  const current = input.id ? d.products.find((p) => p.id === input.id) : undefined
  const at = isoDateTime(DEMO_TODAY)
  if (!current) {
    const product: Product = { id: unique(slug(fields.name), d.products.map((p) => p.id)), ...fields }
    const pieces = input.stock ?? 0
    commit((x) => ({
      ...x,
      products: [...x.products, product],
      stock: { ...x.stock, [branchId]: { ...(x.stock[branchId] ?? {}), [product.id]: pieces } },
      stockMoves: pieces ? [{ id: `mv-${Date.now()}`, branchId, productId: product.id, on: at, change: pieces, reason: 'Existencia inicial' }, ...x.stockMoves] : x.stockMoves,
    }))
    return product
  }
  const changed = (Object.keys(fields) as (keyof typeof fields)[]).some((k) => fields[k] !== current[k])
  const shared = Object.entries(d.stock).some(([id, list]) => id !== branchId && current.id in list)
  if (changed && shared) {
    const copy: Product = { id: unique(`${current.id}-${branchId}`, d.products.map((p) => p.id)), ...fields }
    commit((x) => {
      const mine = { ...(x.stock[branchId] ?? {}) }
      mine[copy.id] = mine[current.id] ?? 0
      delete mine[current.id]
      return { ...x, products: [...x.products, copy], stock: { ...x.stock, [branchId]: mine } }
    })
    return copy
  }
  const saved = { ...current, ...fields }
  commit((x) => ({ ...x, products: x.products.map((p) => (p.id === current.id ? saved : p)) }))
  return saved
}

// RF-W20: the Jefe counts the pieces; the difference is kept with its reason.
export function adjustStock(branchId: string, productId: string, pieces: number, reason: string, actor: Account | null) {
  const d = getData()
  const branch = branchOf(d, branchId)
  requireBusiness(actor, branch.businessId)
  if (!(productId in (d.stock[branchId] ?? {}))) throw new ApiError('not-found', 'Ese producto no está en esta sucursal.')
  const change = pieces - d.stock[branchId][productId]
  commit((x) => ({
    ...x,
    stock: { ...x.stock, [branchId]: { ...x.stock[branchId], [productId]: pieces } },
    stockMoves: change ? [{ id: `mv-${Date.now()}`, branchId, productId, on: isoDateTime(DEMO_TODAY), change, reason }, ...x.stockMoves] : x.stockMoves,
  }))
}

// ---------------------------------------------------------------- Empleados

// The Empleado joins the branch: their account gets the business and the
// app offers them to clients with the services of the branch (RF-W10).
function link(d: DemoData, email: string, name: string, businessId: string, branchId: string, schedule: WeekHours): DemoData {
  const branch = branchOf(d, branchId)
  const existing = d.employees.find((e) => e.email === email)
  const employee: Employee = {
    id: existing?.id ?? unique(slug(name), d.employees.map((e) => e.id)),
    name,
    specialty: existing?.specialty ?? '',
    email,
    businessId,
    branchId,
    bookable: true,
    schedule,
    serviceIds: [...branch.serviceIds],
    status: 'activo',
    migration: null,
    displayName: existing?.displayName ?? name,
    specialties: existing?.specialties ?? [],
  }
  return {
    ...d,
    employees: existing ? d.employees.map((e) => (e.email === email ? employee : e)) : [...d.employees, employee],
    accounts: d.accounts.map((a) => (a.email === email ? { ...a, businessId, branchId } : a)),
  }
}

// RF-W10: accepting a request to join links the Empleado to the branch. A
// migration request (RF-W12) is accepted too, but the Empleado arrives once
// their last appointment in the other business is over.
export function acceptRequest(requestId: string, schedule: WeekHours, actor: Account | null) {
  const r = getData().requests.find((x) => x.id === requestId)
  if (!r || r.status !== 'enviada') throw new ApiError('not-found', 'Esa solicitud ya no está pendiente.')
  requireBusiness(actor, r.businessId)
  commit((d) => {
    const answered = { ...d, requests: d.requests.map((x) => (x.id === requestId ? { ...x, status: 'aceptada' as const } : x)) }
    return r.kind === 'ingreso' ? link(answered, r.email, r.name, r.businessId, r.branchId, schedule) : answered
  })
}

export function rejectRequest(requestId: string, actor: Account | null) {
  const r = getData().requests.find((x) => x.id === requestId)
  if (!r || r.status !== 'enviada') throw new ApiError('not-found', 'Esa solicitud ya no está pendiente.')
  requireBusiness(actor, r.businessId)
  commit((d) => ({ ...d, requests: d.requests.map((x) => (x.id === requestId ? { ...x, status: 'rechazada' as const } : x)) }))
}

// RF-W10, RF-W12: the Empleado asks to join a branch, or to migrate to it.
export function sendRequest(kind: 'ingreso' | 'migracion', businessId: string, branchId: string, actor: Account | null) {
  if (!actor || actor.role !== 'empleado') throw new ApiError('forbidden', 'Solo un Empleado envía solicitudes.')
  const d = getData()
  const branch = branchOf(d, branchId)
  const business = d.businesses.find((b) => b.id === businessId)
  if (!business || branch.businessId !== businessId || business.suspended) throw new ApiError('invalid', 'Ese negocio no recibe solicitudes.')
  if (d.requests.some((r) => r.email === actor.email && r.status === 'enviada')) throw new ApiError('conflict', 'Ya tienes una solicitud esperando respuesta.')
  const number = Math.max(0, ...d.requests.map((r) => Number(r.id.slice(2)) || 0)) + 1
  const from = actor.businessId ? d.businesses.find((b) => b.id === actor.businessId)?.name : undefined
  commit((x) => ({ ...x, requests: [...x.requests, { id: `S-${number}`, businessId, branchId, kind, name: actor.name, email: actor.email, ...(from ? { from } : {}), sentOn: iso(DEMO_TODAY), status: 'enviada' }] }))
}

export function inviteEmployee(email: string, businessId: string, branchId: string, actor: Account | null) {
  requireBusiness(actor, businessId)
  branchOf(getData(), branchId)
  commit((d) => ({ ...d, invitations: [...d.invitations, { id: `I-${Date.now()}`, email: email.trim().toLowerCase(), businessId, branchId, sentOn: iso(DEMO_TODAY) }] }))
}

// The invited Empleado accepts from their panel and joins the branch with
// the hours of the branch as their first schedule.
export function acceptInvitation(invitationId: string, actor: Account | null) {
  const inv = getData().invitations.find((x) => x.id === invitationId)
  if (!inv || !actor || actor.email !== inv.email) throw new ApiError('forbidden', 'Esa invitación no es para tu cuenta.')
  commit((d) => {
    const branch = branchOf(d, inv.branchId)
    return link({ ...d, invitations: d.invitations.filter((x) => x.id !== invitationId) }, actor.email, actor.name, inv.businessId, inv.branchId, branch.hours)
  })
}

export function saveSchedule(employeeId: string, schedule: WeekHours, actor: Account | null) {
  const e = getData().employees.find((x) => x.id === employeeId)
  if (!e) throw new ApiError('not-found', 'Ese Empleado no existe.')
  requireBusiness(actor, e.businessId)
  commit((d) => ({ ...d, employees: d.employees.map((x) => (x.id === employeeId ? { ...x, schedule } : x)) }))
}

// RF-W11: the Empleado's own profile, as clients see it.
export function saveProfile(profile: { displayName: string; specialties: string[] }, actor: Account | null) {
  if (!actor || actor.role !== 'empleado') throw new ApiError('forbidden', 'Solo el Empleado cambia su perfil.')
  commit((d) => ({
    ...d,
    employees: d.employees.map((e) => (e.email === actor.email ? { ...e, displayName: profile.displayName.trim(), specialties: profile.specialties, specialty: profile.specialties.join(', ') || e.specialty } : e)),
  }))
}

// RF-W13: an Empleado who leaves stays in the records (their past
// appointments and reviews), but no longer works at the branch.
export function unlinkEmployee(employeeId: string, actor: Account | null) {
  const e = getData().employees.find((x) => x.id === employeeId)
  if (!e) throw new ApiError('not-found', 'Ese Empleado no existe.')
  requireBusiness(actor, e.businessId)
  commit((d) => ({
    ...d,
    employees: d.employees.map((x) => (x.id === employeeId ? { ...x, status: 'baja' as const, bookable: false } : x)),
    accounts: d.accounts.map((a) => (a.email === e.email ? { ...a, businessId: null, branchId: null } : a)),
  }))
}

export function setMigration(employeeId: string, migration: Employee['migration'], actor: Account | null) {
  const e = getData().employees.find((x) => x.id === employeeId)
  if (!e) throw new ApiError('not-found', 'Ese Empleado no existe.')
  requireBusiness(actor, e.businessId, true)
  commit((d) => ({ ...d, employees: d.employees.map((x) => (x.id === employeeId ? { ...x, status: migration ? 'migracion-pendiente' : 'activo', migration } : x)) }))
}
