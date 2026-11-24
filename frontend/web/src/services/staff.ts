// Demo implementation of the Empleados API (RF-W10 to RF-W13, RF-W17,
// RN-11, RN-12). One store read by the Jefe's pages, the Empleado's pages
// and the Jefe's home (requests to review). Empleados, requests,
// invitations, appointments and blocks live in the database shared with the
// client app (frontend/shared/), so an Empleado accepted here can be booked
// in the app, and a booking made there shows up in the agenda. The history
// of this session and the states forced from the screen index stay here. In production every
// action is a call to the API, which also notifies each client whose
// appointment changes (RF-W16, RN-04).
import { useSyncExternalStore } from 'react'
import { sessionAccount } from '@shared/auth'
import { appointmentStart, fromIsoDateTime, iso, isoDateTime } from '@shared/dates'
import * as catalog from '@shared/catalog'
import * as db from '@shared/store'
import type { Appointment as SharedAppointment, Block as SharedBlock, CancelledBy, DemoData, Employee as SharedEmployee, JoinRequest as SharedRequest } from '@shared/types'
import { DEMO_TODAY } from '../data/demo'
import { ApiError } from './auth'
import { takeForcedError } from './panel'
import type { JoinRequest } from '../data/demo'
import type { Appointment, AppointmentStatus, Block, Employee, HistoryEvent, WeekHours } from '../types/domain'
import { scheduleProblem } from '../schedule'

// An Empleado as the business sees them (RF-W10 to RF-W13).
export type StaffStatus = 'activo' | 'migracion-pendiente'
export interface StaffMember extends Employee {
  email: string
  schedule: WeekHours
  status: StaffStatus
  migration: { to: string; acceptedOn: Date } | null
  // The Jefe already decided about the appointments of a migrating Empleado.
  resolved?: boolean
}
export interface EditableProfile { displayName: string; specialties: string[]; photo: string | null }
// A request the Empleado sent, or an invitation they accepted (RF-W10, RF-W12).
export type MyRequestKind = 'ingreso' | 'migracion' | 'invitacion'
export interface MyRequest { kind: MyRequestKind; businessName: string; branchName: string; sentOn: Date; status: 'enviada' | 'aceptada' | 'rechazada' | 'caducada' }
export interface Invitation { id: string; email: string; businessId: string; businessName: string; branchId: string; branchName: string; sentOn: Date }
export type Arrival = JoinRequest & { schedule: WeekHours; acceptedOn: Date }
export interface StaffState {
  staff: Record<string, StaffMember>
  profiles: Record<string, EditableProfile>
  appointments: Appointment[]
  blocks: Block[]
  log: HistoryEvent[]
  requests: JoinRequest[]
  invitations: Invitation[]
  arrivals: Arrival[]
  notices: string[]
  mine: Record<string, MyRequest>
}
// Decision for each upcoming appointment: another employeeId, keep it ('mismo') or cancel it.
export type Decision = string
export type ReassignMode = 'migracion' | 'desvincular'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const day = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

// What this store keeps itself: the history of this session, the arrivals
// of accepted migrations, notices, photos, and the states the screen index
// forces (a migration pending, sent or expired, an invitation).
interface LocalState {
  log: HistoryEvent[]
  arrivals: Arrival[]
  notices: string[]
  photos: Record<string, string | null>
  resolved: string[]
  staff: Record<string, Partial<StaffMember>>
  mine: Record<string, MyRequest>
  invitations: Invitation[]
}

function seed(estado: string | null): LocalState {
  const local: LocalState = { log: [], arrivals: [], notices: [], photos: {}, resolved: [], staff: {}, mine: {}, invitations: [] }
  // Jefe side: Ramón asked to migrate and Navaja Fina accepted (RF-W12).
  if (estado === 'migracion-pendiente') local.staff.ramon = { status: 'migracion-pendiente', migration: { to: 'Navaja Fina', acceptedOn: day(DEMO_TODAY, -1) } }
  if (estado === 'migracion-enviada') local.mine['luis.ortega@gmail.com'] = { kind: 'migracion', businessName: 'Navaja Fina', branchName: 'Navaja Fina', sentOn: day(DEMO_TODAY, -2), status: 'enviada' }
  if (estado === 'migracion-caducada') local.mine['luis.ortega@gmail.com'] = { kind: 'migracion', businessName: 'Navaja Fina', branchName: 'Navaja Fina', sentOn: day(DEMO_TODAY, -9), status: 'caducada' }
  if (estado === 'migracion-aceptada') {
    local.mine['luis.ortega@gmail.com'] = { kind: 'migracion', businessName: 'Navaja Fina', branchName: 'Navaja Fina', sentOn: day(DEMO_TODAY, -3), status: 'aceptada' }
    local.staff.luis = { status: 'migracion-pendiente', migration: { to: 'Navaja Fina', acceptedOn: day(DEMO_TODAY, -1) } }
  }
  if (estado === 'invitacion') local.invitations = [{ id: 'I-7', email: 'sofia.ramos@gmail.com', businessId: 'los-compas', businessName: 'Barbería Los Compas', branchId: 'los-compas-norte', branchName: 'Los Compas Norte', sentOn: day(DEMO_TODAY, -1) }]
  return local
}

// ---------- Shared records as the panel reads them ----------

// The same shared record always gives the same object, so a change is
// noticed by comparing references.
const panelAppointments = new WeakMap<SharedAppointment, Appointment>()
function toPanel(a: SharedAppointment): Appointment {
  let out = panelAppointments.get(a)
  if (!out) {
    const service = db.getData().services.find((x) => x.id === a.serviceId)
    out = { folio: a.folio, employeeId: a.employeeId, branchId: a.branchId, service: service?.name ?? a.serviceId, minutes: service?.minutes ?? 45, start: appointmentStart(a), client: a.clientName, status: a.status, cancelledBy: a.cancelledBy }
    panelAppointments.set(a, out)
  }
  return out
}

// A change made in the panel, written back on the shared record. When the
// date, time or Empleado changes and the client has to answer (RN-04), the
// record keeps what it was before so the app can show the change (RF-M08).
function fromPanel(shared: SharedAppointment, a: Appointment): SharedAppointment {
  const date = iso(a.start)
  const start = a.start.getHours() * 60 + a.start.getMinutes()
  const moved = date !== shared.date || start !== shared.start || a.employeeId !== shared.employeeId
  const next: SharedAppointment = { ...shared, employeeId: a.employeeId, branchId: a.branchId, date, start, status: a.status }
  next.cancelledBy = a.status === 'cancelada' ? ((a.cancelledBy as CancelledBy | undefined) ?? shared.cancelledBy) : undefined
  if (a.status === 'cambio' && moved) {
    next.previous = shared.previous ?? { employeeId: shared.employeeId, date: shared.date, start: shared.start }
    next.changedAt = 'hoy'
  } else if (a.status !== 'cambio') next.previous = null
  return next
}

const panelBlocks = new WeakMap<SharedBlock, Block>()
function blockToPanel(b: SharedBlock): Block {
  let out = panelBlocks.get(b)
  if (!out) {
    out = { ...b, from: fromIsoDateTime(b.from), to: fromIsoDateTime(b.to) }
    panelBlocks.set(b, out)
  }
  return out
}
const blockFromPanel = (b: Block): SharedBlock => ({ ...b, from: isoDateTime(b.from), to: isoDateTime(b.to) })

const dayOf = (s: string) => new Date(`${s}T00:00`)
const panelStaff = new WeakMap<SharedEmployee, StaffMember>()
function toStaff(e: SharedEmployee): StaffMember {
  let out = panelStaff.get(e)
  if (!out) {
    out = {
      id: e.id, name: e.name, specialty: e.specialty, businessId: e.businessId, branchId: e.branchId, bookable: e.bookable, email: e.email,
      schedule: e.schedule.map((h) => (h ? [h[0], h[1]] : null)),
      status: e.status === 'migracion-pendiente' ? 'migracion-pendiente' : 'activo',
      migration: e.migration ? { to: e.migration.to, acceptedOn: dayOf(e.migration.acceptedOn) } : null,
    }
    panelStaff.set(e, out)
  }
  return out
}
const toRequest = (r: SharedRequest): JoinRequest => ({ id: r.id, businessId: r.businessId, kind: r.kind, name: r.name, email: r.email, branchId: r.branchId, ...(r.from ? { from: r.from } : {}), sentOn: dayOf(r.sentOn) })

let local = seed(null)
let cache: { local: LocalState; data: DemoData; state: StaffState } | null = null
function snapshot(): StaffState {
  const data = db.getData()
  if (cache && cache.local === local && cache.data === data) return cache.state
  const nameOf = (businessId: string, branchId: string) => ({
    businessName: data.businesses.find((b) => b.id === businessId)?.name ?? '',
    branchName: data.branches.find((b) => b.id === branchId)?.name ?? '',
  })
  const staff: Record<string, StaffMember> = {}
  const profiles: Record<string, EditableProfile> = {}
  for (const e of data.employees) {
    profiles[e.email] = { displayName: e.displayName, specialties: e.specialties, photo: local.photos[e.email] ?? null }
    if (e.status === 'baja') continue
    const forced = local.staff[e.id]
    staff[e.id] = { ...toStaff(e), ...(forced ?? {}), ...(local.resolved.includes(e.id) ? { resolved: true } : {}) }
  }
  // An Empleado without a business yet has a profile too.
  for (const a of data.accounts) if (a.role === 'empleado' && !profiles[a.email]) profiles[a.email] = { displayName: a.name, specialties: [], photo: local.photos[a.email] ?? null }
  // RF-W10, RF-W12: the last request of each Empleado, as they see it.
  const mine: Record<string, MyRequest> = {}
  for (const r of data.requests) mine[r.email] = { kind: r.kind, ...nameOf(r.businessId, r.branchId), sentOn: dayOf(r.sentOn), status: r.status }
  const state: StaffState = {
    staff,
    profiles,
    appointments: data.appointments.map(toPanel),
    blocks: data.blocks.map(blockToPanel),
    log: local.log,
    requests: data.requests.filter((r) => r.status === 'enviada').map(toRequest),
    invitations: [...data.invitations.map((i) => ({ id: i.id, email: i.email, businessId: i.businessId, branchId: i.branchId, sentOn: dayOf(i.sentOn), ...nameOf(i.businessId, i.branchId) })), ...local.invitations],
    arrivals: local.arrivals,
    notices: local.notices,
    mine: { ...mine, ...local.mine },
  }
  cache = { local, data, state }
  return state
}

const listeners = new Set<() => void>()
// Also used by services/agenda.ts, which works on the same appointments.
// The appointments and blocks that changed go to the shared store, which
// checks the rules (RN-01, RN-02, RF-W18) for the signed-in account and
// throws, saving nothing, when one is broken. The history and notices of
// this session stay here.
export const set = (fn: (s: StaffState) => StaffState) => {
  const prev = snapshot()
  const next = fn(prev)
  if (next.appointments !== prev.appointments || next.blocks !== prev.blocks) {
    const before = new Map(prev.appointments.map((a) => [a.folio, a]))
    const changed = db.getData().appointments.flatMap((shared) => {
      const a = next.appointments.find((x) => x.folio === shared.folio)
      return a && a !== before.get(shared.folio) ? [fromPanel(shared, a)] : []
    })
    db.savePanelChanges(changed, next.blocks === prev.blocks ? null : next.blocks.map(blockFromPanel), sessionAccount('panel'))
  }
  if (next.log !== prev.log || next.arrivals !== prev.arrivals || next.notices !== prev.notices) local = { ...local, log: next.log, arrivals: next.arrivals, notices: next.notices }
  listeners.forEach((l) => l())
}
const setLocal = (fn: (l: LocalState) => LocalState) => {
  local = fn(local)
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  const off = db.subscribe(l)
  return () => {
    listeners.delete(l)
    off()
  }
}
export const useStaffStore = () => useSyncExternalStore(subscribe, snapshot)
export const getStaffStore = snapshot

// Screen index only: start the panel's own data again, with the forced
// state applied. The shared appointments are kept; they go back to the
// sample data only with "Reiniciar datos de demo".
export function resetDemoStaff(estado: string | null) {
  local = seed(estado)
  listeners.forEach((l) => l())
}

// The shared store answers with a code and a message; the panel shows it.
function call<T>(fn: () => T): T {
  try {
    return fn()
  } catch (err) {
    if (err instanceof db.ApiError) throw new ApiError(err.code === 'not-found' ? 'invalid' : (err.code as 'invalid' | 'conflict' | 'forbidden'), err.message)
    throw err
  }
}
const actor = () => sessionAccount('panel')

function failIfForced() {
  if (takeForcedError('error-guardar')) throw new ApiError('server')
}

// ---------- Rules ----------

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
type Span = { start: Date; minutes: number }
export const overlaps = (a: Span, b: Span) => a.start < new Date(b.start.getTime() + b.minutes * 60000) && b.start < new Date(a.start.getTime() + a.minutes * 60000)

// An appointment still to happen that keeps its slot taken.
export const ACTIVE: AppointmentStatus[] = ['confirmada', 'cambio']
export const isUpcoming = (a: Appointment) => ACTIVE.includes(a.status) && a.start >= DEMO_TODAY
const end = (a: Span) => new Date(a.start.getTime() + a.minutes * 60000)

// Is this slot inside the Empleado's work schedule and outside their blocks? (RF-W10, RF-W15)
export function worksAt(s: StaffState, employeeId: string, start: Date, minutes: number) {
  const e = s.staff[employeeId]
  if (!e) return false
  const hours = e.schedule[start.getDay()]
  if (!hours) return false
  const startMin = start.getHours() * 60 + start.getMinutes()
  if (startMin < minutesOf(hours[0]) || startMin + minutes > minutesOf(hours[1])) return false
  const stop = new Date(start.getTime() + minutes * 60000)
  return !s.blocks.some((b) => b.employeeId === employeeId && start < b.to && stop > b.from)
}

// Is this Empleado working and free for that appointment? (RN-01, RN-11)
export function isFree(s: StaffState, employeeId: string, appt: Pick<Appointment, 'folio' | 'branchId' | 'minutes' | 'start'>, at: Date = appt.start) {
  const e = s.staff[employeeId]
  if (!e || !e.bookable || e.status !== 'activo' || e.branchId !== appt.branchId) return false
  if (!worksAt(s, employeeId, at, appt.minutes)) return false
  const probe = { start: at, minutes: appt.minutes }
  return !s.appointments.some((o) => o.employeeId === employeeId && o.folio !== appt.folio && ACTIVE.includes(o.status) && overlaps(o, probe))
}

// RN-11: the system proposes another Empleado of the branch who is free at
// that time. When nobody is, a migrating Empleado keeps the appointment by
// default; an unlinked one cannot, so it has to be cancelled (RF-W13).
export function proposalsFor(s: StaffState, employeeId: string, mode: ReassignMode) {
  return s.appointments
    .filter((a) => a.employeeId === employeeId && isUpcoming(a))
    .map((a) => {
      const free = Object.keys(s.staff).filter((id) => id !== employeeId && isFree(s, id, a))
      return { appt: a, free, proposal: free[0] ?? (mode === 'migracion' ? 'mismo' : 'cancelar') }
    })
}

export const lastAppointmentOf = (s: StaffState, employeeId: string): Appointment | null =>
  s.appointments.filter((a) => a.employeeId === employeeId && isUpcoming(a)).sort((a, b) => end(b).getTime() - end(a).getTime())[0] ?? null

// ---------- Jefe actions ----------

export async function inviteEmployee({ email, branchId, businessId }: Omit<Invitation, 'id' | 'sentOn'>) {
  await wait(700)
  failIfForced()
  call(() => catalog.inviteEmployee(email, businessId, branchId, actor()))
}

// RF-W10: accepting links the Empleado to the branch with a work schedule;
// from then on the app offers them to clients. A migration request (RF-W12)
// is accepted too, but the Empleado arrives once their last appointment in
// the other business is over.
export async function acceptRequest(requestId: string, schedule: WeekHours) {
  await wait(700)
  failIfForced()
  const r = snapshot().requests.find((x) => x.id === requestId)
  call(() => catalog.acceptRequest(requestId, schedule, actor()))
  if (r?.kind === 'migracion') setLocal((l) => ({ ...l, arrivals: [...l.arrivals, { ...r, schedule, acceptedOn: DEMO_TODAY }] }))
}

// RF-W10: the Empleado sees it as rejected and can ask another business.
export async function rejectRequest(requestId: string) {
  await wait(600)
  failIfForced()
  call(() => catalog.rejectRequest(requestId, actor()))
}

export async function saveSchedule(employeeId: string, schedule: WeekHours) {
  await wait(600)
  failIfForced()
  const problem = scheduleProblem(schedule)
  if (problem) throw new ApiError('invalid', problem)
  call(() => catalog.saveSchedule(employeeId, schedule, actor()))
}

// Applies the Jefe's decision for each upcoming appointment of an Empleado
// who migrates or is unlinked. decisions: { folio: employeeId | 'mismo' | 'cancelar' }.
// Returns what happened so the page can explain it.
export interface ResolveResult { done: boolean; cancelled: number; reassigned: number }
export async function resolveAppointments(employeeId: string, decisions: Record<string, Decision>, mode: ReassignMode): Promise<ResolveResult> {
  await wait(900)
  failIfForced()
  const before = snapshot()
  const e = before.staff[employeeId]
  set((s) => {
    // A reassigned appointment waits for the client's answer (RN-04); a
    // cancelled one keeps its record with who cancelled it.
    const appointments = s.appointments.map((a): Appointment => {
      if (a.employeeId !== employeeId || !isUpcoming(a)) return a
      const d = decisions[a.folio]
      if (d === 'cancelar') return { ...a, status: 'cancelada', cancelledBy: 'Jefe' }
      if (d && d !== 'mismo') return { ...a, employeeId: d, status: 'cambio' }
      return a
    })
    const log = [
      ...s.log,
      ...s.appointments
        .filter((a) => a.employeeId === employeeId && isUpcoming(a) && decisions[a.folio] === 'cancelar')
        .map((a, i): HistoryEvent => ({ id: `log-r-${s.log.length + i}`, employeeId, folio: a.folio, service: a.service, action: 'cancelada', by: 'Jefe', on: DEMO_TODAY })),
    ]
    return { ...s, appointments, log }
  })
  const cancelled = Object.values(decisions).filter((d) => d === 'cancelar').length
  const reassigned = Object.values(decisions).filter((d) => !['mismo', 'cancelar'].includes(d)).length
  const remaining = snapshot().appointments.filter((a) => a.employeeId === employeeId && isUpcoming(a))
  if (mode === 'desvincular' || !remaining.length) {
    // RF-W13, RN-11: unlinked, or with no appointments left the migration
    // completes now. Their history and reviews stay in the business.
    call(() => catalog.unlinkEmployee(employeeId, actor()))
    if (mode === 'migracion') setLocal((l) => ({ ...l, notices: [...l.notices, `${e.name} terminó su migración a ${e.migration?.to}. Su historial de citas y sus reseñas se quedan en el negocio.`] }))
    return { done: true, cancelled, reassigned }
  }
  setLocal((l) => ({ ...l, resolved: [...l.resolved, employeeId] }))
  return { done: false, cancelled, reassigned }
}

// ---------- Empleado actions ----------

// RF-W11: what clients see of the Empleado in the app. The photo stays in
// this tab (it is a file of this browser).
export async function saveProfile(email: string, profile: EditableProfile) {
  await wait(700)
  failIfForced()
  if (db.getData().employees.some((e) => e.email === email)) call(() => catalog.saveProfile(profile, actor()))
  setLocal((l) => ({ ...l, photos: { ...l.photos, [email]: profile.photo } }))
}

// RF-W12: a request to another business; it expires after 7 days without an answer.
// RF-W10: an Empleado without a business asks to join a branch the same way.
export async function sendRequest(_email: string, kind: 'ingreso' | 'migracion', businessId: string, branchId: string) {
  await wait(700)
  failIfForced()
  call(() => catalog.sendRequest(kind, businessId, branchId, actor()))
}

export async function acceptInvitation(invitationId: string) {
  await wait(700)
  failIfForced()
  const forced = local.invitations.find((x) => x.id === invitationId)
  if (forced) {
    // The invitation of the screen index: the same as a real one, but in this tab only.
    setLocal((l) => ({ ...l, invitations: l.invitations.filter((x) => x.id !== invitationId), mine: { ...l.mine, [forced.email]: { kind: 'invitacion', businessName: forced.businessName, branchName: forced.branchName, sentOn: forced.sentOn, status: 'aceptada' } } }))
    return
  }
  call(() => catalog.acceptInvitation(invitationId, actor()))
}

export const MIGRATION_DAYS = 7
export const expiresOn = (sentOn: Date) => day(sentOn, MIGRATION_DAYS)
