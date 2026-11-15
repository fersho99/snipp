// Demo implementation of the Empleados API (RF-W10 to RF-W13, RF-W17,
// RN-11, RN-12). One in-memory store read by the Jefe's pages, the
// Empleado's pages and the Jefe's home (requests to review). In production
// every action is a call to the API, which also notifies each client whose
// appointment changes (RF-W16, RN-04).
import { useSyncExternalStore } from 'react'
import { DEMO_TODAY, employees as baseEmployees, pendingRequests } from '../data/demo'
import { directory, staffProfiles, upcomingAppointments } from '../data/staff'
import { ApiError } from './auth'
import { getDemoEstado } from './panel'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const EMAILS = { luis: 'luis.ortega@gmail.com', ramon: 'ramon.cazares@gmail.com', itzel: 'itzel.duarte@gmail.com', oscar: 'oscar.felix@gmail.com' }
const day = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

function seed(estado) {
  const staff = {}
  for (const e of baseEmployees) {
    staff[e.id] = { ...e, email: EMAILS[e.id], schedule: staffProfiles[e.id].schedule, status: 'activo', migration: null }
  }
  // Jefe side: Ramón asked to migrate and Navaja Fina accepted (RF-W12).
  if (estado === 'migracion-pendiente') {
    staff.ramon = { ...staff.ramon, status: 'migracion-pendiente', migration: { to: 'Navaja Fina', acceptedOn: day(DEMO_TODAY, -1) } }
  }
  const profiles = {}
  for (const e of baseEmployees) profiles[EMAILS[e.id]] = { displayName: staffProfiles[e.id].displayName, specialties: [...staffProfiles[e.id].specialties], photo: null }
  profiles['sofia.ramos@gmail.com'] = { displayName: 'Sofía Ramos', specialties: ['Fades', 'Cejas'], photo: null }

  // Requests an Empleado sent from their own panel (RF-W10, RF-W12).
  const mine = {
    'sofia.ramos@gmail.com': { kind: 'ingreso', businessName: 'Barbería Los Compas', branchName: 'Los Compas Centro', sentOn: new Date(2026, 10, 10), status: 'enviada' },
  }
  if (estado === 'migracion-enviada') mine['luis.ortega@gmail.com'] = { kind: 'migracion', businessName: 'Navaja Fina', branchName: 'Navaja Fina', sentOn: day(DEMO_TODAY, -2), status: 'enviada' }
  if (estado === 'migracion-caducada') mine['luis.ortega@gmail.com'] = { kind: 'migracion', businessName: 'Navaja Fina', branchName: 'Navaja Fina', sentOn: day(DEMO_TODAY, -9), status: 'caducada' }
  if (estado === 'migracion-aceptada') {
    mine['luis.ortega@gmail.com'] = { kind: 'migracion', businessName: 'Navaja Fina', branchName: 'Navaja Fina', sentOn: day(DEMO_TODAY, -3), status: 'aceptada' }
    staff.luis = { ...staff.luis, status: 'migracion-pendiente', migration: { to: 'Navaja Fina', acceptedOn: day(DEMO_TODAY, -1) } }
  }
  const invitations = estado === 'invitacion'
    ? [{ id: 'I-7', email: 'sofia.ramos@gmail.com', businessId: 'los-compas', businessName: 'Barbería Los Compas', branchId: 'los-compas-norte', branchName: 'Los Compas Norte', sentOn: day(DEMO_TODAY, -1) }]
    : []

  return {
    staff,
    profiles,
    upcoming: upcomingAppointments.map((a) => ({ ...a })),
    requests: pendingRequests.map((r) => ({ ...r })),
    invitations,
    arrivals: [],
    notices: [],
    mine,
  }
}

let state = seed(null)
const listeners = new Set()
const set = (fn) => {
  state = fn(state)
  listeners.forEach((l) => l())
}
const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const useStaffStore = () => useSyncExternalStore(subscribe, () => state)
export const getStaffStore = () => state

// Screen index only: start the demo again, with the forced state applied.
export function resetDemoStaff(estado) {
  state = seed(estado)
}

function failIfForced() {
  if (getDemoEstado() === 'error-guardar') throw new ApiError('server')
}

// ---------- Rules ----------

const minutesOf = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const overlaps = (a, b) => a.start < new Date(b.start.getTime() + b.minutes * 60000) && b.start < new Date(a.start.getTime() + a.minutes * 60000)

// Is this Empleado working and free for that appointment? (RN-02, RN-11)
export function isFree(s, employeeId, appt) {
  const e = s.staff[employeeId]
  if (!e || !e.bookable || e.status !== 'activo' || e.branchId !== appt.branchId) return false
  const hours = e.schedule[appt.start.getDay()]
  if (!hours) return false
  const startMin = appt.start.getHours() * 60 + appt.start.getMinutes()
  if (startMin < minutesOf(hours[0]) || startMin + appt.minutes > minutesOf(hours[1])) return false
  return !s.upcoming.some((o) => o.employeeId === employeeId && o.folio !== appt.folio && overlaps(o, appt))
}

// RN-11: the system proposes another Empleado of the branch who is free at
// that time. When nobody is, a migrating Empleado keeps the appointment by
// default; an unlinked one cannot, so it has to be cancelled (RF-W13).
export function proposalsFor(s, employeeId, mode) {
  return s.upcoming
    .filter((a) => a.employeeId === employeeId)
    .sort((a, b) => a.start - b.start)
    .map((a) => {
      const free = Object.keys(s.staff).filter((id) => id !== employeeId && isFree(s, id, a))
      return { appt: a, free, proposal: free[0] ?? (mode === 'migracion' ? 'mismo' : 'cancelar') }
    })
}

export const lastAppointmentOf = (s, employeeId) =>
  s.upcoming.filter((a) => a.employeeId === employeeId).sort((a, b) => b.start - a.start)[0] ?? null

// ---------- Jefe actions ----------

export async function inviteEmployee({ email, branchId, branchName, businessId, businessName }) {
  await wait(700)
  failIfForced()
  set((s) => ({ ...s, invitations: [...s.invitations, { id: `I-${Date.now()}`, email: email.trim().toLowerCase(), branchId, branchName, businessId, businessName, sentOn: DEMO_TODAY }] }))
}

// RF-W10: accepting links the Empleado to the branch with a work schedule.
// A migration request (RF-W12) is accepted too, but the Empleado arrives
// once their last appointment in the other business is over.
export async function acceptRequest(requestId, schedule) {
  await wait(700)
  failIfForced()
  set((s) => {
    const r = s.requests.find((x) => x.id === requestId)
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

export async function rejectRequest(requestId) {
  await wait(600)
  failIfForced()
  set((s) => ({ ...s, requests: s.requests.filter((x) => x.id !== requestId) }))
}

export async function saveSchedule(employeeId, schedule) {
  await wait(600)
  failIfForced()
  set((s) => ({ ...s, staff: { ...s.staff, [employeeId]: { ...s.staff[employeeId], schedule } } }))
}

// Applies the Jefe's decision for each upcoming appointment of an Empleado
// who migrates or is unlinked. decisions: { folio: employeeId | 'mismo' | 'cancelar' }.
// Returns what happened so the page can explain it.
export async function resolveAppointments(employeeId, decisions, mode) {
  await wait(900)
  failIfForced()
  let result
  set((s) => {
    const e = s.staff[employeeId]
    const upcoming = s.upcoming
      .filter((a) => !(a.employeeId === employeeId && decisions[a.folio] === 'cancelar'))
      .map((a) => (a.employeeId === employeeId && decisions[a.folio] && !['mismo', 'cancelar'].includes(decisions[a.folio]) ? { ...a, employeeId: decisions[a.folio] } : a))
    const cancelled = Object.values(decisions).filter((d) => d === 'cancelar').length
    const reassigned = Object.values(decisions).filter((d) => !['mismo', 'cancelar'].includes(d)).length
    const remaining = upcoming.filter((a) => a.employeeId === employeeId).sort((a, b) => b.start - a.start)
    const staff = { ...s.staff }
    let notices = s.notices
    if (mode === 'desvincular') {
      delete staff[employeeId]
      result = { done: true, cancelled, reassigned }
    } else if (!remaining.length) {
      // RN-11: with no appointments left the migration completes now.
      delete staff[employeeId]
      notices = [...notices, `${e.name} terminó su migración a ${e.migration.to}. Su historial de citas y sus reseñas se quedan en el negocio.`]
      result = { done: true, cancelled, reassigned }
    } else {
      staff[employeeId] = { ...e, resolved: true }
      result = { done: false, cancelled, reassigned, last: remaining[0] }
    }
    return { ...s, upcoming, staff, notices }
  })
  return result
}

// ---------- Empleado actions ----------

export async function saveProfile(email, profile) {
  await wait(700)
  failIfForced()
  set((s) => ({ ...s, profiles: { ...s.profiles, [email]: profile } }))
}

// RF-W12: a request to another business; it expires after 7 days without an answer.
// RF-W10: an Empleado without a business asks to join a branch the same way.
export async function sendRequest(email, kind, businessId, branchId) {
  await wait(700)
  failIfForced()
  const b = directory.find((x) => x.id === businessId)
  const br = b.branches.find((x) => x.id === branchId)
  set((s) => ({ ...s, mine: { ...s.mine, [email]: { kind, businessName: b.name, branchName: br.name, sentOn: DEMO_TODAY, status: 'enviada' } } }))
}

export async function acceptInvitation(invitationId) {
  await wait(700)
  failIfForced()
  set((s) => {
    const inv = s.invitations.find((x) => x.id === invitationId)
    return { ...s, invitations: s.invitations.filter((x) => x.id !== invitationId), mine: { ...s.mine, [inv.email]: { kind: 'invitacion', businessName: inv.businessName, branchName: inv.branchName, sentOn: inv.sentOn, status: 'aceptada' } } }
  })
}

export const MIGRATION_DAYS = 7
export const expiresOn = (sentOn) => day(sentOn, MIGRATION_DAYS)
