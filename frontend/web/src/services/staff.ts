// Demo implementation of the Empleados API (RF-W10 to RF-W13, RF-W17,
// RN-11, RN-12). One store read by the Jefe's pages, the Empleado's pages
// and the Jefe's home (requests to review). Appointments and blocks live in
// the database shared with the client app (frontend/shared/store.ts), so a
// booking made in the app shows up in the agenda and a change made here
// reaches the app; the rest stays in memory for now. In production every
// action is a call to the API, which also notifies each client whose
// appointment changes (RF-W16, RN-04).
import { useSyncExternalStore } from 'react'
import { appointmentStart, fromIsoDateTime, iso, isoDateTime } from '@shared/dates'
import { services as sharedServices, employees as sharedEmployees } from '@shared/seed'
import * as db from '@shared/store'
import type { Appointment as SharedAppointment, Block as SharedBlock, CancelledBy, DemoData } from '@shared/types'
import { DEMO_TODAY, employees as baseEmployees, pendingRequests } from '../data/demo'
import { directory, staffProfiles } from '../data/staff'
import { ApiError } from './auth'
import { takeForcedError } from './panel'
import type { JoinRequest } from '../data/demo'
import type { Appointment, AppointmentStatus, Block, Employee, HistoryEvent, WeekHours } from '../types/domain'

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
export interface MyRequest { kind: MyRequestKind; businessName: string; branchName: string; sentOn: Date; status: 'enviada' | 'aceptada' | 'caducada' }
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
const EMAILS: Record<string, string> = Object.fromEntries(sharedEmployees.map((e) => [e.id, e.email]))
const day = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

// What this store keeps itself; appointments and blocks come from the shared database.
type LocalState = Omit<StaffState, 'appointments' | 'blocks'>

function seed(estado: string | null): LocalState {
  const staff: Record<string, StaffMember> = {}
  for (const e of baseEmployees) {
    staff[e.id] = { ...e, email: EMAILS[e.id], schedule: staffProfiles[e.id].schedule, status: 'activo', migration: null }
  }
  // Jefe side: Ramón asked to migrate and Navaja Fina accepted (RF-W12).
  if (estado === 'migracion-pendiente') {
    staff.ramon = { ...staff.ramon, status: 'migracion-pendiente', migration: { to: 'Navaja Fina', acceptedOn: day(DEMO_TODAY, -1) } }
  }
  const profiles: Record<string, EditableProfile> = {}
  for (const e of baseEmployees) profiles[EMAILS[e.id]] = { displayName: staffProfiles[e.id].displayName, specialties: [...staffProfiles[e.id].specialties], photo: null }
  profiles['sofia.ramos@gmail.com'] = { displayName: 'Sofía Ramos', specialties: ['Fades', 'Cejas'], photo: null }

  // Requests an Empleado sent from their own panel (RF-W10, RF-W12).
  const mine: Record<string, MyRequest> = {
    'sofia.ramos@gmail.com': { kind: 'ingreso', businessName: 'Barbería Los Compas', branchName: 'Los Compas Centro', sentOn: new Date(2026, 10, 10), status: 'enviada' },
  }
  if (estado === 'migracion-enviada') mine['luis.ortega@gmail.com'] = { kind: 'migracion', businessName: 'Navaja Fina', branchName: 'Navaja Fina', sentOn: day(DEMO_TODAY, -2), status: 'enviada' }
  if (estado === 'migracion-caducada') mine['luis.ortega@gmail.com'] = { kind: 'migracion', businessName: 'Navaja Fina', branchName: 'Navaja Fina', sentOn: day(DEMO_TODAY, -9), status: 'caducada' }
  if (estado === 'migracion-aceptada') {
    mine['luis.ortega@gmail.com'] = { kind: 'migracion', businessName: 'Navaja Fina', branchName: 'Navaja Fina', sentOn: day(DEMO_TODAY, -3), status: 'aceptada' }
    staff.luis = { ...staff.luis, status: 'migracion-pendiente', migration: { to: 'Navaja Fina', acceptedOn: day(DEMO_TODAY, -1) } }
  }
  const invitations: Invitation[] = estado === 'invitacion'
    ? [{ id: 'I-7', email: 'sofia.ramos@gmail.com', businessId: 'los-compas', businessName: 'Barbería Los Compas', branchId: 'los-compas-norte', branchName: 'Los Compas Norte', sentOn: day(DEMO_TODAY, -1) }]
    : []

  return {
    staff,
    profiles,
    log: [], // history entries added in this session (RF-W17)
    requests: pendingRequests.map((r) => ({ ...r })),
    invitations,
    arrivals: [],
    notices: [],
    mine,
  }
}

// ---------- Shared records as the panel reads them ----------

// The same shared record always gives the same object, so a change is
// noticed by comparing references.
const panelAppointments = new WeakMap<SharedAppointment, Appointment>()
function toPanel(a: SharedAppointment): Appointment {
  let out = panelAppointments.get(a)
  if (!out) {
    const service = sharedServices.find((x) => x.id === a.serviceId)
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

let local = seed(null)
let cache: { local: LocalState; data: DemoData; state: StaffState } | null = null
function snapshot(): StaffState {
  const data = db.getData()
  if (!cache || cache.local !== local || cache.data !== data) {
    cache = { local, data, state: { ...local, appointments: data.appointments.map(toPanel), blocks: data.blocks.map(blockToPanel) } }
  }
  return cache.state
}

const listeners = new Set<() => void>()
// Also used by services/agenda.ts, which works on the same appointments.
export const set = (fn: (s: StaffState) => StaffState) => {
  const prev = snapshot()
  const { appointments, blocks, ...rest } = fn(prev)
  local = rest
  if (appointments !== prev.appointments || blocks !== prev.blocks) {
    const before = new Map(prev.appointments.map((a) => [a.folio, a]))
    db.commit((d) => ({
      ...d,
      appointments: d.appointments.map((shared) => {
        const a = appointments.find((x) => x.folio === shared.folio)
        return a && a !== before.get(shared.folio) ? fromPanel(shared, a) : shared
      }),
      blocks: blocks === prev.blocks ? d.blocks : blocks.map(blockFromPanel),
    }))
  }
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
}

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

export async function inviteEmployee({ email, branchId, branchName, businessId, businessName }: Omit<Invitation, 'id' | 'sentOn'>) {
  await wait(700)
  failIfForced()
  set((s) => ({ ...s, invitations: [...s.invitations, { id: `I-${Date.now()}`, email: email.trim().toLowerCase(), branchId, branchName, businessId, businessName, sentOn: DEMO_TODAY }] }))
}

// RF-W10: accepting links the Empleado to the branch with a work schedule.
// A migration request (RF-W12) is accepted too, but the Empleado arrives
// once their last appointment in the other business is over.
export async function acceptRequest(requestId: string, schedule: WeekHours) {
  await wait(700)
  failIfForced()
  set((s) => {
    const r = s.requests.find((x) => x.id === requestId)
    if (!r) return s
    const requests = s.requests.filter((x) => x.id !== requestId)
    if (r.kind === 'migracion') return { ...s, requests, arrivals: [...s.arrivals, { ...r, schedule, acceptedOn: DEMO_TODAY }] }
    const id = r.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')
    const email = r.email
    return {
      ...s,
      requests,
      staff: { ...s.staff, [id]: { id, name: r.name, specialty: (s.profiles[email]?.specialties ?? []).join(', '), businessId: r.businessId, branchId: r.branchId, bookable: true, email, schedule, status: 'activo', migration: null } },
      mine: s.mine[email] ? { ...s.mine, [email]: { ...s.mine[email], status: 'aceptada' } } : s.mine,
    }
  })
}

export async function rejectRequest(requestId: string) {
  await wait(600)
  failIfForced()
  set((s) => ({ ...s, requests: s.requests.filter((x) => x.id !== requestId) }))
}

export async function saveSchedule(employeeId: string, schedule: WeekHours) {
  await wait(600)
  failIfForced()
  set((s) => ({ ...s, staff: { ...s.staff, [employeeId]: { ...s.staff[employeeId], schedule } } }))
}

// Applies the Jefe's decision for each upcoming appointment of an Empleado
// who migrates or is unlinked. decisions: { folio: employeeId | 'mismo' | 'cancelar' }.
// Returns what happened so the page can explain it.
export interface ResolveResult { done: boolean; cancelled: number; reassigned: number }
export async function resolveAppointments(employeeId: string, decisions: Record<string, Decision>, mode: ReassignMode): Promise<ResolveResult> {
  await wait(900)
  failIfForced()
  let result: ResolveResult = { done: false, cancelled: 0, reassigned: 0 }
  set((s) => {
    const e = s.staff[employeeId]
    // A reassigned appointment waits for the client's answer (RN-04); a
    // cancelled one keeps its record with who cancelled it.
    const appointments = s.appointments.map((a): Appointment => {
      if (a.employeeId !== employeeId || !isUpcoming(a)) return a
      const d = decisions[a.folio]
      if (d === 'cancelar') return { ...a, status: 'cancelada', cancelledBy: 'Jefe' }
      if (d && d !== 'mismo') return { ...a, employeeId: d, status: 'cambio' }
      return a
    })
    const cancelled = Object.values(decisions).filter((d) => d === 'cancelar').length
    const reassigned = Object.values(decisions).filter((d) => !['mismo', 'cancelar'].includes(d)).length
    const remaining = appointments.filter((a) => a.employeeId === employeeId && isUpcoming(a))
    const staff = { ...s.staff }
    let notices = s.notices
    if (mode === 'desvincular') {
      delete staff[employeeId]
      result = { done: true, cancelled, reassigned }
    } else if (!remaining.length) {
      // RN-11: with no appointments left the migration completes now.
      delete staff[employeeId]
      notices = [...notices, `${e.name} terminó su migración a ${e.migration?.to}. Su historial de citas y sus reseñas se quedan en el negocio.`]
      result = { done: true, cancelled, reassigned }
    } else {
      staff[employeeId] = { ...e, resolved: true }
      result = { done: false, cancelled, reassigned }
    }
    const log = [
      ...s.log,
      ...s.appointments
        .filter((a) => a.employeeId === employeeId && isUpcoming(a) && decisions[a.folio] === 'cancelar')
        .map((a, i): HistoryEvent => ({ id: `log-r-${s.log.length + i}`, employeeId, folio: a.folio, service: a.service, action: 'cancelada', by: 'Jefe', on: DEMO_TODAY })),
    ]
    return { ...s, appointments, staff, notices, log }
  })
  return result
}

// ---------- Empleado actions ----------

export async function saveProfile(email: string, profile: EditableProfile) {
  await wait(700)
  failIfForced()
  set((s) => ({ ...s, profiles: { ...s.profiles, [email]: profile } }))
}

// RF-W12: a request to another business; it expires after 7 days without an answer.
// RF-W10: an Empleado without a business asks to join a branch the same way.
export async function sendRequest(email: string, kind: 'ingreso' | 'migracion', businessId: string, branchId: string) {
  await wait(700)
  failIfForced()
  const b = directory.find((x) => x.id === businessId)
  const br = b?.branches.find((x) => x.id === branchId)
  if (!b || !br) throw new ApiError('server')
  set((s) => ({ ...s, mine: { ...s.mine, [email]: { kind, businessName: b.name, branchName: br.name, sentOn: DEMO_TODAY, status: 'enviada' } } }))
}

export async function acceptInvitation(invitationId: string) {
  await wait(700)
  failIfForced()
  set((s) => {
    const inv = s.invitations.find((x) => x.id === invitationId)
    if (!inv) return s
    return { ...s, invitations: s.invitations.filter((x) => x.id !== invitationId), mine: { ...s.mine, [inv.email]: { kind: 'invitacion', businessName: inv.businessName, branchName: inv.branchName, sentOn: inv.sentOn, status: 'aceptada' } } }
  })
}

export const MIGRATION_DAYS = 7
export const expiresOn = (sentOn: Date) => day(sentOn, MIGRATION_DAYS)
