// Reviews and reports after the appointment (RF-M12 to RF-M14, RF-W14,
// RF-W23, RF-W28, RN-15, RN-16). The client sends them from the app
// (store.ts patchAppointment); here the Jefe follows up a report, whose
// state the client sees in "Mis reportes", and reports a review to the
// Administrador, who removes it from the app or keeps it.
import { requireBusiness } from './catalog'
import { DEMO_TODAY, isoDateTime } from './dates'
import { withNotification } from './effects'
import { ApiError, commit, getData } from './store'
import type { Account, AppointmentReport, ReportState } from './types'

const APP_STATE: Record<ReportState, AppointmentReport['state']> = { enviado: 'enviado', 'en revision': 'en revisión', atendido: 'atendido' }
const STATE_TEXT: Record<ReportState, string> = { enviado: 'enviado', 'en revision': 'en revisión', atendido: 'atendido' }

function reportFor(id: string, actor: Account | null) {
  const r = getData().reports.find((x) => x.id === id)
  if (!r) throw new ApiError('not-found', 'Ese reporte no existe.')
  // RN-15: only the Jefe of that business follows it, never the Empleado.
  requireBusiness(actor, r.businessId)
  return r
}

// RF-W14, RF-M14: the new state reaches the client's app.
export function setReportState(id: string, state: ReportState, actor: Account | null) {
  const r = reportFor(id, actor)
  if (r.state === state) return
  const at = isoDateTime(DEMO_TODAY)
  commit((d) => {
    const out = {
      ...d,
      reports: d.reports.map((x) => (x.id === id ? { ...x, state, changes: [...x.changes, { on: at, state }] } : x)),
      appointments: d.appointments.map((a) => (a.folio === r.folio && a.report ? { ...a, report: { ...a.report, state: APP_STATE[state] } } : a)),
    }
    const branch = d.branches.find((b) => b.id === r.branchId)
    return withNotification(out, r.clientEmail, 'reporte', `Tu reporte de la cita ${r.folio} está ${STATE_TEXT[state]}`, `${branch?.name ?? 'La sucursal'} le está dando seguimiento.`, '/reportes')
  })
}

export function addReportNote(id: string, text: string, actor: Account | null) {
  reportFor(id, actor)
  commit((d) => ({ ...d, reports: d.reports.map((x) => (x.id === id ? { ...x, notes: [...x.notes, { id: `n-${Date.now()}`, on: isoDateTime(DEMO_TODAY), author: actor?.name ?? '', text: text.trim() }] } : x)) }))
}

// RF-W23: the Jefe reports a review of their business, once.
export function reportReview(id: string, reason: string, detail: string, actor: Account | null) {
  const r = getData().reviews.find((x) => x.id === id)
  if (!r) throw new ApiError('not-found', 'Esa reseña no existe.')
  requireBusiness(actor, r.businessId)
  if (r.reported) throw new ApiError('conflict', 'Ya reportaste esta reseña.')
  commit((d) => ({ ...d, reviews: d.reviews.map((x) => (x.id === id ? { ...x, reported: { reason, detail: detail.trim(), on: isoDateTime(DEMO_TODAY), state: 'enviado' } } : x)) }))
}

// RF-W28: the Administrador removes the review (it leaves the app and the
// business average) or keeps it.
export function decideReview(id: string, decision: 'eliminada' | 'mantenida', actor: Account | null) {
  if (!actor || actor.role !== 'admin') throw new ApiError('forbidden', 'Solo el Administrador decide sobre una reseña reportada.')
  const r = getData().reviews.find((x) => x.id === id)
  if (!r?.reported) throw new ApiError('not-found', 'Esa reseña no está reportada.')
  commit((d) => ({ ...d, reviews: d.reviews.map((x) => (x.id === id && x.reported ? { ...x, reported: { ...x.reported, state: decision, decidedOn: isoDateTime(DEMO_TODAY) } } : x)) }))
}

// A removed review is not shown anywhere but in the Administrador's history.
export const isPublished = (r: { reported: { state: string } | null }) => r.reported?.state !== 'eliminada'
