// Business rules of the SRS v1.2, written once and checked by the simulated
// database (store.ts), not only by the screens: a change sent from the
// browser console breaks the same rule and is rejected the same way. Each
// check returns the problem, or null when the change is allowed. The real
// API must check them again on the server.
import { DEMO_TODAY, appointmentStart, fromIsoDateTime, iso } from './dates'
import { LIMITS, checkBookingDate, checkText } from './validators'
import type { Account, Appointment, AppointmentStatus, Business, DemoData } from './types'

export type ProblemCode = 'invalid' | 'conflict' | 'forbidden' | 'not-found'
export interface Problem {
  code: ProblemCode
  message: string
}
const problem = (code: ProblemCode, message: string): Problem => ({ code, message })

// Appointments that keep their slot taken.
export const ACTIVE: AppointmentStatus[] = ['confirmada', 'cambio']
// RN-03: the client cancels or reschedules from the app up to 2 hours before.
export const CANCEL_HOURS = 2
// RF-M13: reasons of a report.
export const REPORT_REASONS = ['trato', 'puntualidad', 'higiene', 'calidad', 'otro']

// RN-13: a business with its subscription overdue or suspended by the
// Administrador does not show in the app and takes no bookings.
export function businessVisible(b: Business | undefined, today = DEMO_TODAY) {
  return !!b && !b.suspended && b.subscription.endsOn >= iso(today)
}

const minutesOfService = (d: DemoData, serviceId: string) => d.services.find((s) => s.id === serviceId)?.minutes ?? 45

type Slot = Pick<Appointment, 'branchId' | 'employeeId' | 'serviceId' | 'date' | 'start'> & { folio?: string }

// A slot the Empleado can take: inside the two months (RN-02), not in the
// past, and not over another appointment or a block of theirs (RN-01).
export function slotProblem(d: DemoData, slot: Slot, today = DEMO_TODAY): Problem | null {
  const branch = d.branches.find((b) => b.id === slot.branchId)
  if (!branch) return problem('not-found', 'Esa sucursal no existe.')
  const employee = d.employees.find((e) => e.id === slot.employeeId)
  if (!employee || employee.branchId !== slot.branchId) return problem('invalid', 'Ese profesional no trabaja en esta sucursal.')
  if (!Number.isInteger(slot.start) || slot.start < 0 || slot.start >= 24 * 60) return problem('invalid', 'Elige una hora válida.')
  const dateError = checkBookingDate(slot.date, today)
  if (dateError) return problem('invalid', dateError)
  const start = appointmentStart(slot)
  if (start < today) return problem('invalid', 'Esa hora ya pasó. Elige otra.')
  const end = new Date(start.getTime() + minutesOfService(d, slot.serviceId) * 60000)
  const taken = d.appointments.some((o) => {
    if (o.folio === slot.folio || o.employeeId !== slot.employeeId || !ACTIVE.includes(o.status)) return false
    const oStart = appointmentStart(o)
    return start < new Date(oStart.getTime() + minutesOfService(d, o.serviceId) * 60000) && oStart < end
  })
  if (taken) return problem('conflict', 'Ese horario ya está ocupado. Elige otro.')
  const blocked = d.blocks.some((b) => b.employeeId === slot.employeeId && start < fromIsoDateTime(b.to) && fromIsoDateTime(b.from) < end)
  if (blocked) return problem('conflict', 'El profesional no atiende en ese horario. Elige otro.')
  return null
}

// RF-M06: a client books for themselves in a business that shows in the app.
export function bookingProblem(d: DemoData, slot: Slot, actor: Account | null, today = DEMO_TODAY): Problem | null {
  if (!actor || actor.role !== 'cliente') return problem('forbidden', 'Entra con tu cuenta para reservar.')
  const branch = d.branches.find((b) => b.id === slot.branchId)
  if (!branch) return problem('not-found', 'Esa sucursal no existe.')
  if (!businessVisible(d.businesses.find((b) => b.id === branch.businessId), today)) return problem('invalid', 'Este negocio no está recibiendo reservas.')
  if (!d.services.some((s) => s.id === slot.serviceId)) return problem('not-found', 'Ese servicio no existe.')
  return slotProblem(d, slot, today)
}

const changed = <K extends keyof Appointment>(before: Appointment, patch: Partial<Appointment>, key: K) => key in patch && patch[key] !== before[key]
const moved = (before: Appointment, patch: Partial<Appointment>) => changed(before, patch, 'date') || changed(before, patch, 'start') || changed(before, patch, 'employeeId')

// RN-08: one review per attended appointment, 1 to 5 stars.
export function reviewProblem(before: Appointment, review: Appointment['review']): Problem | null {
  if (before.review) return problem('conflict', 'Ya calificaste esta cita.')
  if (before.status !== 'atendida') return problem('invalid', 'Solo puedes calificar una cita atendida.')
  if (!review || !Number.isInteger(review.stars) || review.stars < 1 || review.stars > 5) return problem('invalid', 'Elige de 1 a 5 estrellas.')
  const text = checkText(review.text ?? '', LIMITS.review)
  return text ? problem('invalid', text) : null
}

// RN-15: one report per appointment, only if attended or "Empleado no se presentó".
export function reportProblem(before: Appointment, report: Appointment['report']): Problem | null {
  if (before.report) return problem('conflict', 'Ya reportaste esta cita.')
  if (before.status !== 'atendida' && before.status !== 'empleado-no-se-presento') return problem('invalid', 'Solo puedes reportar una cita atendida o en la que el profesional no se presentó.')
  if (!report || !REPORT_REASONS.includes(report.reason)) return problem('invalid', 'Elige el motivo del reporte.')
  const text = checkText(report.text ?? '', LIMITS.report)
  return text ? problem('invalid', text) : null
}

// What the client may change on their own appointment from the app.
const CLIENT_FIELDS: (keyof Appointment)[] = ['status', 'cancelledBy', 'employeeId', 'date', 'start', 'previous', 'rescheduledFrom', 'review', 'report']

export function clientChangeProblem(d: DemoData, before: Appointment, patch: Partial<Appointment>, actor: Account | null, today = DEMO_TODAY): Problem | null {
  if (!actor || actor.role !== 'cliente' || before.clientEmail !== actor.email) return problem('forbidden', 'Esta cita no es tuya.')
  const extra = (Object.keys(patch) as (keyof Appointment)[]).filter((k) => !CLIENT_FIELDS.includes(k) && patch[k] !== before[k])
  if (extra.length) return problem('forbidden', 'Ese dato de la cita no se puede cambiar desde la app.')
  if (changed(before, patch, 'review')) return reviewProblem(before, patch.review)
  if (changed(before, patch, 'report')) return reportProblem(before, patch.report)

  const status = patch.status ?? before.status
  const cancelling = status === 'cancelada' && before.status !== 'cancelada'
  if (changed(before, patch, 'status') || moved(before, patch)) {
    // The client cancels, reschedules, or accepts a change the business proposed.
    if (!ACTIVE.includes(before.status)) return problem('invalid', 'Esta cita ya no se puede cambiar.')
    if (cancelling ? patch.cancelledBy !== 'cliente' : status !== 'confirmada') return problem('forbidden', 'Ese cambio lo hace solo el negocio.')
    // RN-03 (RN-04: answering a change of the business has no minimum notice).
    if (before.status === 'confirmada') {
      const deadline = appointmentStart(before).getTime() - CANCEL_HOURS * 3600 * 1000
      if (today.getTime() >= deadline) return problem('invalid', `Ya no se puede ${cancelling ? 'cancelar' : 'cambiar'} desde la app: faltan menos de ${CANCEL_HOURS} horas. Llama a la sucursal.`)
    }
    if (!cancelling && moved(before, patch)) return slotProblem(d, { ...before, ...patch, folio: before.folio }, today)
  }
  return null
}

// What the business may change on an appointment from the panel.
const PANEL_FIELDS: (keyof Appointment)[] = ['status', 'cancelledBy', 'employeeId', 'date', 'start', 'previous', 'changedAt', 'note']

// RF-W16 to RF-W18: the Jefe changes the appointments of their business;
// an Empleado only their own, and cannot give them to someone else.
export function panelChangeProblem(d: DemoData, before: Appointment, next: Appointment, actor: Account | null, today = DEMO_TODAY): Problem | null {
  const branch = d.branches.find((b) => b.id === before.branchId)
  if (!actor || !branch) return problem('forbidden', 'Entra al panel para cambiar citas.')
  if (actor.role === 'jefe') {
    if (actor.businessId !== branch.businessId) return problem('forbidden', 'Esta cita es de otro negocio.')
  } else if (actor.role === 'empleado') {
    const me = d.employees.find((e) => e.email === actor.email)
    if (!me || me.id !== before.employeeId) return problem('forbidden', 'Solo puedes cambiar tus propias citas.')
    if (next.employeeId !== before.employeeId) return problem('forbidden', 'Solo el Jefe pasa una cita a otro profesional.')
  } else return problem('forbidden', 'Tu cuenta no administra citas.')

  const extra = (Object.keys(next) as (keyof Appointment)[]).filter((k) => !PANEL_FIELDS.includes(k) && next[k] !== before[k])
  if (extra.length) return problem('forbidden', 'Ese dato de la cita no se puede cambiar desde el panel.')
  // Attended or no-show only once the appointment started.
  const outcome: AppointmentStatus[] = ['atendida', 'no-asistio', 'empleado-no-se-presento']
  if (next.status !== before.status && outcome.includes(next.status) && appointmentStart(next) > today) return problem('invalid', 'Ese estado se marca cuando la cita ya empezó.')
  const isMoved = moved(before, next)
  const reactivated = ACTIVE.includes(next.status) && !ACTIVE.includes(before.status)
  if (isMoved || reactivated) return slotProblem(d, { ...next, folio: before.folio }, today)
  return null
}

// ----------------------------------------------------------- shop (RF-M09 to RF-M11)

// RN-06: one cart per branch, at most 3 open at a time.
export const MAX_CARTS = 3
export function cartProblem(openBranchIds: string[], branchId: string): Problem | null {
  return !openBranchIds.includes(branchId) && openBranchIds.length >= MAX_CARTS
    ? problem('conflict', `Ya tienes ${MAX_CARTS} carritos abiertos. Paga o vacía uno para empezar otro.`)
    : null
}

// RN-07, RN-18: whole pieces, never more than the branch has.
export function quantityProblem(qty: number, stock: number): Problem | null {
  if (!Number.isInteger(qty) || qty < 0) return problem('invalid', 'La cantidad debe ser un número entero.')
  if (qty > stock) return problem('conflict', stock > 0 ? `Solo hay ${stock} ${stock === 1 ? 'pieza' : 'piezas'}.` : 'Este producto se agotó.')
  return null
}

// RN-09: points are spent only in the business where they were earned,
// never more than the balance there nor more than the purchase.
export function pointsProblem(used: number, balance: number, subtotal: number): Problem | null {
  if (!Number.isInteger(used) || used < 0) return problem('invalid', 'Los puntos deben ser un número entero.')
  if (used > balance) return problem('invalid', 'No tienes tantos puntos en este negocio.')
  if (used > subtotal) return problem('invalid', 'Los puntos no pueden pasar del total de la compra.')
  return null
}

// RN-20: the same payment never creates two orders.
export function paymentProblem(usedReferences: string[], reference: string): Problem | null {
  if (!reference) return problem('invalid', 'El pago no tiene referencia.')
  return usedReferences.includes(reference) ? problem('conflict', 'Este pago ya se registró; no se cobró dos veces.') : null
}
