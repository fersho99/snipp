// Demo implementation of the agenda API (RF-W15, RF-W16, RF-W18, RN-01,
// RN-03, RN-04). Works on the same appointments as the Empleados pages.
// Every change made by the business sends the client a notification; when
// the date, time or Empleado changes, the client can accept, reschedule or
// cancel without the minimum notice (RN-04): the appointment shows
// "Esperando respuesta del cliente" until then.
import { DEMO_TODAY } from '../data/demo'
import { ApiError } from './auth'
import { getDemoEstado } from './panel'
import { ACTIVE, getStaffStore, isFree, isUpcoming, set, type StaffState } from './staff'
import type { Appointment, AppointmentStatus, Block, HistoryEvent, Session } from '../types/domain'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
function failIfForced() {
  if (getDemoEstado() === 'error-guardar') throw new ApiError('server')
}

export const STATUS: Record<AppointmentStatus, string> = {
  confirmada: 'Confirmada',
  cambio: 'Esperando respuesta del cliente',
  atendida: 'Atendida',
  'no-asistio': 'No asistió',
  'empleado-no-se-presento': 'Empleado no se presentó',
  cancelada: 'Cancelada',
}
// The states the business can set by hand (RF-W18).
export const SETTABLE: AppointmentStatus[] = ['confirmada', 'atendida', 'no-asistio', 'empleado-no-se-presento', 'cancelada']
// Attended / no-show only make sense once the appointment started.
export const needsStarted = (status: AppointmentStatus) => ['atendida', 'no-asistio', 'empleado-no-se-presento'].includes(status)
export const hasStarted = (a: Appointment) => a.start <= DEMO_TODAY

// RN-03: an Empleado manages only their own appointments; the Jefe, all of the business.
export function canManage(session: Session, appt: Appointment) {
  if (session.role === 'jefe') return true
  const me = Object.values(getStaffStore().staff).find((e) => e.email === session.email)
  return session.role === 'empleado' && me?.id === appt.employeeId
}
const who = (session: Session) => (session.role === 'jefe' ? 'Jefe' : 'Empleado')

// RF-W17: each confirmation, cancellation and reschedule goes to the
// Empleado's history with who did it.
const logged = (s: StaffState, appt: Appointment, action: string, by: string): HistoryEvent[] => [...s.log, { id: `log-${s.log.length + 1}`, employeeId: appt.employeeId, folio: appt.folio, service: appt.service, action, by, on: DEMO_TODAY }]

function update(folio: string, fn: (a: Appointment, s: StaffState) => { appt: Appointment; log?: HistoryEvent[] }) {
  set((s) => {
    const a = s.appointments.find((x) => x.folio === folio)
    if (!a) return s
    const { appt, log } = fn(a, s)
    return { ...s, appointments: s.appointments.map((x) => (x.folio === folio ? appt : x)), log: log ?? s.log }
  })
}

export async function setStatus(session: Session, folio: string, status: AppointmentStatus) {
  await wait(500)
  failIfForced()
  update(folio, (a, s) => ({
    appt: { ...a, status, cancelledBy: status === 'cancelada' ? who(session) : undefined },
    log: status === 'confirmada' || status === 'cancelada' ? logged(s, a, status, who(session)) : s.log,
  }))
}

// Free start times for an appointment on a day, every 15 minutes, for one Empleado (RN-01).
export function freeTimes(s: StaffState, appt: Appointment, employeeId: string, day: Date) {
  const out: Date[] = []
  for (let t = 8 * 60; t <= 21 * 60; t += 15) {
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(t / 60), t % 60)
    if (at < DEMO_TODAY) continue
    if (isFree(s, employeeId, appt, at)) out.push(at)
  }
  return out
}

export async function reschedule(session: Session, folio: string, start: Date) {
  await wait(600)
  failIfForced()
  update(folio, (a, s) => ({ appt: { ...a, start, status: 'cambio' }, log: logged(s, a, 'reagendada', who(session)) }))
}

// RF-W16: only the Jefe moves an appointment to another Empleado.
export async function reassign(folio: string, employeeId: string) {
  await wait(600)
  failIfForced()
  update(folio, (a) => ({ appt: { ...a, employeeId, status: 'cambio' } }))
}

// RF-W16: all upcoming appointments of an Empleado at once. Those the target
// cannot take (busy, off or blocked at that time) stay as they were and are
// returned, so the Jefe can handle them one by one.
export async function reassignAll(fromId: string, toId: string): Promise<{ moved: number; conflicts: Appointment[] }> {
  await wait(900)
  failIfForced()
  let result: { moved: number; conflicts: Appointment[] } = { moved: 0, conflicts: [] }
  set((s) => {
    let work = s
    const moved: string[] = []
    const conflicts: Appointment[] = []
    for (const a of s.appointments.filter((x) => x.employeeId === fromId && isUpcoming(x)).sort((x, y) => x.start.getTime() - y.start.getTime())) {
      if (isFree(work, toId, a)) {
        moved.push(a.folio)
        work = { ...work, appointments: work.appointments.map((x) => (x.folio === a.folio ? { ...x, employeeId: toId, status: 'cambio' as const } : x)) }
      } else conflicts.push(a)
    }
    result = { moved: moved.length, conflicts }
    return work
  })
  return result
}

export async function cancelAll(fromId: string) {
  await wait(900)
  failIfForced()
  let count = 0
  set((s) => ({
    ...s,
    appointments: s.appointments.map((a): Appointment => {
      if (a.employeeId !== fromId || !isUpcoming(a)) return a
      count++
      return { ...a, status: 'cancelada', cancelledBy: 'Jefe' }
    }),
    log: [...s.log, ...s.appointments.filter((a) => a.employeeId === fromId && isUpcoming(a)).map((a, i): HistoryEvent => ({ id: `log-${s.log.length + i + 1}`, employeeId: a.employeeId, folio: a.folio, service: a.service, action: 'cancelada', by: 'Jefe', on: DEMO_TODAY }))],
  }))
  return count
}

// RF-W15: blocked time is not offered in the app. Appointments already in
// that time are not cancelled; they are returned so the page can warn.
export function appointmentsInside(s: StaffState, employeeId: string, from: Date, to: Date) {
  return s.appointments.filter((a) => a.employeeId === employeeId && ACTIVE.includes(a.status) && a.start < to && new Date(a.start.getTime() + a.minutes * 60000) > from)
}

export async function addBlock(block: Omit<Block, 'id'>) {
  await wait(600)
  failIfForced()
  set((s) => ({ ...s, blocks: [...s.blocks, { ...block, id: `B-${Date.now()}` }] }))
}

export async function removeBlock(id: string) {
  await wait(500)
  failIfForced()
  set((s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== id) }))
}
