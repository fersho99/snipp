// What a change brings with it, as pure functions on the data: the
// notification the client receives (RF-M16) and the points they earn or get
// back (RF-M15, RN-09). The store applies them in the same commit as the
// change, the way the API would in one transaction.
import { DEMO_TODAY, appointmentStart, iso, isoDateTime } from './dates'
import type { Appointment, ClientNotification, DemoData, NotificationKind, PointsMovement } from './types'

let counter = 0
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter += 1)}`

// Every notification gets the demo's "now"; the list keeps them newest first.
export function withNotification(d: DemoData, clientEmail: string | null | undefined, kind: NotificationKind, title: string, body: string, route: string): DemoData {
  if (!clientEmail) return d
  const n: ClientNotification = { id: nextId('n'), clientEmail, kind, title, body, route, at: isoDateTime(DEMO_TODAY), read: false }
  return { ...d, notifications: [n, ...d.notifications] }
}

export function withPoints(d: DemoData, clientEmail: string | null | undefined, businessId: string, points: number, label: string, route: string): DemoData {
  if (!clientEmail || !points) return d
  const m: PointsMovement = { id: nextId('m'), clientEmail, businessId, points, label, on: iso(DEMO_TODAY), route }
  return { ...d, points: [m, ...d.points] }
}

export const pointsBalance = (d: DemoData, clientEmail: string, businessId: string) =>
  d.points.filter((m) => m.clientEmail === clientEmail && m.businessId === businessId).reduce((s, m) => s + m.points, 0)

export const loyaltyOf = (d: DemoData, businessId: string) =>
  d.loyalty[businessId] ?? { pesosPerPointAppointments: 10, pesosPerPointPurchases: 10, pesosPerPointRedeemed: 1 }

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const timeOf = (d: Date) => {
  const h = d.getHours() % 12 || 12
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'am' : 'pm'}`
}
// "el martes 24 a las 6:00 pm"
export const whenText = (a: Pick<Appointment, 'date' | 'start'>) => {
  const d = appointmentStart(a)
  return `el ${DAYS[d.getDay()]} ${d.getDate()} a las ${timeOf(d)}`
}
export const dayMonth = (date: string) => {
  const [, m, day] = date.split('-').map(Number)
  return `${day} de ${MONTHS[m - 1]}`
}

// What the business did to an appointment, told to its client (RF-M16, RN-04):
// a change of date, time or Empleado waits for their answer; a cancellation
// frees the time. Attended appointments earn points in that business.
export function appointmentEffects(d: DemoData, before: Appointment, next: Appointment): DemoData {
  const branch = d.branches.find((b) => b.id === next.branchId)
  const business = d.businesses.find((b) => b.id === branch?.businessId)
  const service = d.services.find((s) => s.id === next.serviceId)
  const employee = d.employees.find((e) => e.id === next.employeeId)
  const place = branch?.name ?? 'La sucursal'
  const what = (service?.name ?? 'Tu cita').toLowerCase()
  let out = d
  if (next.status === 'cambio' && (before.status !== 'cambio' || before.date !== next.date || before.start !== next.start || before.employeeId !== next.employeeId)) {
    out = withNotification(out, next.clientEmail, 'cambio', `${place} cambió tu cita`, `Tu ${what} ahora es ${whenText(next)} con ${employee?.name ?? 'otro profesional'}. Acepta el cambio, reagenda o cancela.`, `/cambio/${next.folio}`)
  }
  if (next.status === 'cancelada' && before.status !== 'cancelada' && next.cancelledBy !== 'cliente') {
    out = withNotification(out, next.clientEmail, 'cancelacion', `${place} canceló tu cita ${whenText(before)}`, `Tu ${what} con ${d.employees.find((e) => e.id === before.employeeId)?.name ?? 'el profesional'}. Puedes reservar otro horario.`, `/cita/${next.folio}`)
  }
  if (next.status === 'atendida' && before.status !== 'atendida' && business && service) {
    const earned = Math.floor(service.price / loyaltyOf(d, business.id).pesosPerPointAppointments)
    out = withPoints(out, next.clientEmail, business.id, earned, `${service.name}, cita ${next.folio} atendida`, `/cita/${next.folio}`)
  }
  return out
}

// RF-M12, RF-M13: a review or a report sent from the app is also published
// for the business: the review on the branch page and in the Jefe's panel,
// the report only for the Jefe (RN-15).
export function feedbackEffects(d: DemoData, before: Appointment, next: Appointment): DemoData {
  const branch = d.branches.find((b) => b.id === next.branchId)
  const service = d.services.find((s) => s.id === next.serviceId)
  const employee = d.employees.find((e) => e.id === next.employeeId)
  const serviceText = `${service?.name ?? 'Servicio'} con ${employee?.name ?? 'el profesional'}`
  let out = d
  if (next.review && !before.review && branch) {
    out = {
      ...out,
      reviews: [
        { id: `rv-${next.folio}`, businessId: branch.businessId, branchId: branch.id, employeeId: next.employeeId, folio: next.folio, author: next.clientName, clientEmail: next.clientEmail, stars: next.review.stars, on: iso(DEMO_TODAY), service: serviceText, text: next.review.text, reported: null },
        ...out.reviews,
      ],
    }
  }
  if (next.report && !before.report && branch) {
    const number = Math.max(0, ...out.reports.map((r) => Number(r.id.slice(2)) || 0)) + 1
    out = {
      ...out,
      reports: [
        { id: `R-${number}`, businessId: branch.businessId, branchId: branch.id, employeeId: next.employeeId, folio: next.folio, service: service?.name ?? '', apptOn: isoDateTime(appointmentStart(next)), client: next.clientName, clientEmail: next.clientEmail, reason: next.report.reason, state: 'enviado', sentOn: isoDateTime(DEMO_TODAY), text: next.report.text, notes: [], changes: [] },
        ...out.reports,
      ],
    }
  }
  return out
}
