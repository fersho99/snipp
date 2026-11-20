// Demo implementation of client reports (RF-W14, RF-M13, RF-M14, RN-15,
// RN-16) and of reviews reported to the Administrator (RF-W23).
// The reports sent from the mobile app land here; a change of status made
// by the Jefe is what the client sees in "Mis reportes". Only the Jefe of
// that business and the Administrator see a report; the reported Empleado
// does not (RN-15). Reports stay in the business where they happened (RN-16).
import { useSyncExternalStore } from 'react'
import { DEMO_TODAY } from '../data/demo'
import { ApiError } from './auth'
import { takeForcedError } from './panel'

export type ReportReason = 'trato' | 'puntualidad' | 'higiene' | 'calidad' | 'otro'
export type ReportState = 'enviado' | 'en revision' | 'atendido'
export interface ReportNote { id: string; on: Date; author: string; text: string }
// RF-W14, RF-M13: a client's report about an Empleado.
export interface ClientReport {
  id: string
  businessId: string
  employeeId: string
  branchId: string
  folio: string
  service: string
  apptOn: Date
  client: string
  reason: ReportReason
  state: ReportState
  sentOn: Date
  text: string
  notes: ReportNote[]
  changes: { on: Date; state: ReportState }[]
}
// RF-W23, RF-W28: the Administrator decides about a reported review.
export type ReviewDecision = 'eliminada' | 'mantenida'
export interface ReviewReport { reason: string; detail: string; on: Date; state: 'enviado' | ReviewDecision; decidedOn?: Date }
export interface Review {
  id: string
  businessId: string
  branchId: string
  author: string
  stars: number
  on: Date
  service: string
  text: string
  reported: ReviewReport | null
}
export interface ReportsState { reports: ClientReport[]; reviews: Review[] }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const d = (m: number, day: number, h = 12, min = 0) => new Date(2026, m - 1, day, h, min)

export const REPORT_REASONS: Record<ReportReason, string> = { trato: 'Trato', puntualidad: 'Puntualidad', higiene: 'Higiene', calidad: 'Calidad del servicio', otro: 'Otro' }
// Same three states the client sees in the app (RF-M14).
export const REPORT_STATE: Record<ReportState, string> = { enviado: 'Nuevo', 'en revision': 'En revisión', atendido: 'Atendido' }
export const CLIENT_STATE: Record<ReportState, string> = { enviado: 'Enviado', 'en revision': 'En revisión', atendido: 'Atendido' }

function seedReports(): ClientReport[] {
  return [
    {
      id: 'R-119', businessId: 'los-compas', employeeId: 'oscar', branchId: 'los-compas-norte', folio: 'C-10520', service: 'Fade', apptOn: d(11, 11, 17, 0),
      client: 'Emilio Castro', reason: 'puntualidad', state: 'enviado', sentOn: d(11, 12, 9, 15),
      text: 'Tenía cita a las 5:00 y Óscar me atendió a las 5:40. Nadie me avisó del retraso y tuve que irme corriendo al trabajo.',
      notes: [], changes: [],
    },
    {
      id: 'R-118', businessId: 'los-compas', employeeId: 'ramon', branchId: 'los-compas-centro', folio: 'C-10512', service: 'Corte + barba', apptOn: d(11, 11, 18, 0),
      client: 'Héctor Villa', reason: 'trato', state: 'enviado', sentOn: d(11, 11, 19, 40),
      text: 'Le pedí que me dejara más largo arriba y me contestó de mala gana que así no se usaba. Me sentí incómodo todo el corte.',
      notes: [], changes: [],
    },
    {
      // Same report the client sees in the mobile app (C-10370).
      id: 'R-102', businessId: 'los-compas', employeeId: 'luis', branchId: 'los-compas-centro', folio: 'C-10370', service: 'Fade', apptOn: d(10, 3, 18, 0),
      client: 'Andrea Valenzuela', reason: 'puntualidad', state: 'en revision', sentOn: d(10, 3, 19, 5),
      text: 'Llegué a las 6:00 pm y Luis no estaba. Esperé 25 minutos y nadie me avisó que no iba a venir.',
      notes: [{ id: 'n1', on: d(10, 4, 10, 20), author: 'Martín Salazar', text: 'Luis dice que tuvo una emergencia familiar y le avisó a Itzel, pero Itzel no le marcó a la clienta. Hablar con los dos.' }],
      changes: [{ on: d(10, 4, 10, 18), state: 'en revision' }],
    },
    {
      // Same report the client sees in the mobile app (C-10318).
      id: 'R-088', businessId: 'los-compas', employeeId: 'ramon', branchId: 'los-compas-centro', folio: 'C-10318', service: 'Corte + barba', apptOn: d(9, 12, 16, 0),
      client: 'Andrea Valenzuela', reason: 'higiene', state: 'atendido', sentOn: d(9, 12, 18, 30),
      text: 'La capa que me pusieron tenía cabello del cliente anterior y Ramón no la cambió cuando se lo dije.',
      notes: [
        { id: 'n2', on: d(9, 13, 11, 0), author: 'Martín Salazar', text: 'Se habló con Ramón. Desde hoy cada cliente lleva capa limpia; se compraron 6 capas más.' },
      ],
      changes: [{ on: d(9, 13, 10, 45), state: 'en revision' }, { on: d(9, 14, 9, 30), state: 'atendido' }],
    },
    {
      id: 'R-071', businessId: 'los-compas', employeeId: 'luis', branchId: 'los-compas-centro', folio: 'C-10244', service: 'Arreglo de barba', apptOn: d(8, 22, 12, 30),
      client: 'Raúl Quintero', reason: 'calidad', state: 'atendido', sentOn: d(8, 22, 15, 10),
      text: 'El perfilado de la barba quedó chueco del lado izquierdo.',
      notes: [{ id: 'n3', on: d(8, 23, 10, 0), author: 'Martín Salazar', text: 'Se le ofreció un arreglo sin costo; vino el 24 y quedó conforme.' }],
      changes: [{ on: d(8, 23, 9, 50), state: 'en revision' }, { on: d(8, 24, 13, 0), state: 'atendido' }],
    },
  ]
}

// Reasons the Jefe can give when reporting a review (RF-W23).
export const REVIEW_REPORT_REASONS = [
  'Lenguaje ofensivo o discriminatorio',
  'Datos personales de alguien',
  'Publicidad o spam',
  'No habla de un servicio de este negocio',
  'Otro',
]

// Latest reviews of each branch. The first five are the ones the mobile app shows.
function seedReviews(): Review[] {
  return [
    { id: 'r6', businessId: 'los-compas', branchId: 'los-compas-centro', author: 'Usuario 4821', stars: 1, on: d(11, 10), service: 'Fade con Luis Ortega', text: 'Pésimo lugar, el barbero es un inútil y la dueña de enfrente también, no vayan, mejor vayan a la barbería de mi primo en la calle 8 (653 555 0192).', reported: null },
    { id: 'r1', businessId: 'los-compas', branchId: 'los-compas-centro', author: 'Jorge Méndez', stars: 5, on: d(11, 4), service: 'Fade con Luis Ortega', text: 'Llegué a las 5:30 y a las 5:32 ya estaba en la silla. Luis dejó el fade parejo y me explicó cómo peinarlo en la casa.', reported: null },
    { id: 'r2', businessId: 'los-compas', branchId: 'los-compas-centro', author: 'Carlos Ríos', stars: 5, on: d(11, 1), service: 'Corte + barba con Ramón Cázares', text: 'Ramón trabaja la navaja con mucha calma. La barba me quedó definida sin irritación.', reported: null },
    { id: 'r3', businessId: 'los-compas', branchId: 'los-compas-centro', author: 'Daniela Paz', stars: 3, on: d(10, 28), service: 'Corte clásico con Ramón Cázares', text: 'Buen corte, pero esperé 15 minutos aunque tenía cita a las 12:00.', reported: null },
    { id: 'r4', businessId: 'los-compas', branchId: 'los-compas-norte', author: 'Iván Soto', stars: 5, on: d(11, 6), service: 'Fade con Óscar Félix', text: 'Sin espera y el corte quedó igual que en la del centro.', reported: null },
    { id: 'r5', businessId: 'los-compas', branchId: 'los-compas-norte', author: 'Luz Gámez', stars: 4, on: d(10, 30), service: 'Corte clásico con Óscar Félix', text: 'Le corté el pelo a mi hijo de 8 años. Mucha paciencia con él.', reported: null },
    { id: 'r7', businessId: 'los-compas', branchId: 'los-compas-norte', author: 'Mario Leyva', stars: 2, on: d(10, 21), service: 'Corte + barba con Óscar Félix', text: 'El corte bien, pero la barba quedó dispareja y no me la quisieron retocar.', reported: null },
    { id: 'm2', businessId: 'estudio-marisol', branchId: 'estudio-marisol', author: 'Paty Robles', stars: 1, on: d(11, 8), service: 'Uñas acrílicas con Fernanda Lugo', text: 'La que me atendió es una cochina y una ratera, ojalá le cierren el negocio. Su número es 653 110 2299 por si le quieren reclamar.', reported: { reason: 'Datos personales de alguien', detail: 'Publica el teléfono personal de Fernanda y la insulta.', on: d(11, 9, 10, 30), state: 'enviado' } },
    { id: 'r8', businessId: 'los-compas', branchId: 'los-compas-centro', author: 'Pedro Lugo', stars: 1, on: d(10, 15), service: 'Corte clásico con Ramón Cázares', text: 'Compren en la tienda online de cortes-baratos punto com, 50% de descuento en todo. Este negocio no sirve.', reported: { reason: 'Publicidad o spam', detail: '', on: d(10, 16, 9, 0), state: 'enviado' } },
  ]
}

let state: ReportsState = { reports: seedReports(), reviews: seedReviews() }
const listeners = new Set<() => void>()
const set = (fn: (s: ReportsState) => ReportsState) => {
  state = fn(state)
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const useReportsStore = () => useSyncExternalStore(subscribe, () => state)
export const getReportsStore = () => state

// Screen index only.
export function resetDemoReports(estado: string | null) {
  state = { reports: seedReports(), reviews: seedReviews() }
  if (estado === 'sin-reportes') state = { ...state, reports: [] }
  if (estado === 'sin-resenas') state = { ...state, reviews: [] }
}

function failIfForced() {
  if (takeForcedError('error-guardar')) throw new ApiError('server')
}

export async function setReportState(id: string, next: ReportState) {
  await wait(600)
  failIfForced()
  set((s) => ({ ...s, reports: s.reports.map((r) => (r.id === id ? { ...r, state: next, changes: [...r.changes, { on: DEMO_TODAY, state: next }] } : r)) }))
}

// Internal notes: only the Jefe sees them, never the client or the Empleado.
export async function addNote(id: string, author: string, text: string) {
  await wait(500)
  failIfForced()
  set((s) => ({ ...s, reports: s.reports.map((r) => (r.id === id ? { ...r, notes: [...r.notes, { id: `n-${Date.now()}`, on: DEMO_TODAY, author, text }] } : r)) }))
}

// RF-W28: the Administrator deletes the reported review (it leaves the app)
// or keeps it; the Jefe who reported it sees the decision.
export async function decideReview(id: string, decision: ReviewDecision) {
  await wait(700)
  failIfForced()
  set((s) => ({ ...s, reviews: s.reviews.map((r) => (r.id === id && r.reported ? { ...r, reported: { ...r.reported, state: decision, decidedOn: DEMO_TODAY } } : r)) }))
}

// RF-W23: the review stays visible until the Administrator decides (RF-W28).
export async function reportReview(id: string, reason: string, detail: string) {
  await wait(700)
  failIfForced()
  set((s) => ({ ...s, reviews: s.reviews.map((r) => (r.id === id ? { ...r, reported: { reason, detail, on: DEMO_TODAY, state: 'enviado' as const } } : r)) }))
}
