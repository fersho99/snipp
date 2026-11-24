// Demo implementation of client reports (RF-W14, RF-M13, RF-M14, RN-15,
// RN-16) and of reviews reported to the Administrator (RF-W23), on the
// database shared with the client app (frontend/shared/feedback.ts).
// The reports sent from the mobile app land here; a change of status made
// by the Jefe is what the client sees in "Mis reportes". Only the Jefe of
// that business and the Administrator see a report; the reported Empleado
// does not (RN-15). Reports stay in the business where they happened (RN-16).
import { useSyncExternalStore } from 'react'
import { sessionAccount } from '@shared/auth'
import { fromIsoDateTime } from '@shared/dates'
import * as feedback from '@shared/feedback'
import { ApiError as SharedApiError, getData, subscribe as onDataChange } from '@shared/store'
import type { ClientReport as SharedReport, DemoData, Review as SharedReview } from '@shared/types'
import { ApiError } from './auth'
import { takeForcedError } from './panel'
import { LIMITS, checkText } from '@shared/validators'

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

export const REPORT_REASONS: Record<ReportReason, string> = { trato: 'Trato', puntualidad: 'Puntualidad', higiene: 'Higiene', calidad: 'Calidad del servicio', otro: 'Otro' }
// Same three states the client sees in the app (RF-M14).
export const REPORT_STATE: Record<ReportState, string> = { enviado: 'Nuevo', 'en revision': 'En revisión', atendido: 'Atendido' }
export const CLIENT_STATE: Record<ReportState, string> = { enviado: 'Enviado', 'en revision': 'En revisión', atendido: 'Atendido' }

// Reasons the Jefe can give when reporting a review (RF-W23).
export const REVIEW_REPORT_REASONS = [
  'Lenguaje ofensivo o discriminatorio',
  'Datos personales de alguien',
  'Publicidad o spam',
  'No habla de un servicio de este negocio',
  'Otro',
]

const at = (s: string) => fromIsoDateTime(s.includes('T') ? s : `${s}T12:00`)
const panelReports = new WeakMap<SharedReport, ClientReport>()
function toPanelReport(r: SharedReport): ClientReport {
  let out = panelReports.get(r)
  if (!out) {
    out = {
      ...r,
      reason: r.reason as ReportReason,
      apptOn: at(r.apptOn),
      sentOn: at(r.sentOn),
      notes: r.notes.map((n) => ({ ...n, on: at(n.on) })),
      changes: r.changes.map((c) => ({ ...c, on: at(c.on) })),
    }
    panelReports.set(r, out)
  }
  return out
}
const panelReviews = new WeakMap<SharedReview, Review>()
function toPanelReview(r: SharedReview): Review {
  let out = panelReviews.get(r)
  if (!out) {
    out = {
      id: r.id, businessId: r.businessId, branchId: r.branchId, author: r.author, stars: r.stars, on: at(r.on), service: r.service, text: r.text,
      reported: r.reported ? { reason: r.reported.reason, detail: r.reported.detail, on: at(r.reported.on), state: r.reported.state, ...(r.reported.decidedOn ? { decidedOn: at(r.reported.decidedOn) } : {}) } : null,
    }
    panelReviews.set(r, out)
  }
  return out
}

// Screen index only: no reports, or no reviews.
let empty = { reports: false, reviews: false }
let cache: { data: DemoData; empty: typeof empty; state: ReportsState } | null = null
function snapshot(): ReportsState {
  const data = getData()
  if (cache && cache.data === data && cache.empty === empty) return cache.state
  const state: ReportsState = {
    reports: empty.reports ? [] : data.reports.map(toPanelReport),
    reviews: empty.reviews ? [] : [...data.reviews].sort((x, y) => y.on.localeCompare(x.on)).map(toPanelReview),
  }
  cache = { data, empty, state }
  return state
}
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  const off = onDataChange(l)
  return () => {
    listeners.delete(l)
    off()
  }
}
export const useReportsStore = () => useSyncExternalStore(subscribe, snapshot, snapshot)
export const getReportsStore = snapshot

// Screen index only.
export function resetDemoReports(estado: string | null) {
  empty = { reports: estado === 'sin-reportes', reviews: estado === 'sin-resenas' }
  listeners.forEach((l) => l())
}

function failIfForced() {
  if (takeForcedError('error-guardar')) throw new ApiError('server')
}
// The shared store answers with a code and a message; the panel shows it.
function call<T>(fn: () => T): T {
  try {
    return fn()
  } catch (err) {
    if (err instanceof SharedApiError) throw new ApiError(err.code === 'not-found' ? 'invalid' : (err.code as 'invalid' | 'conflict' | 'forbidden'), err.message)
    throw err
  }
}
const actor = () => sessionAccount('panel')

// RF-W14: the new state reaches the client's "Mis reportes" (RF-M14).
export async function setReportState(id: string, next: ReportState) {
  await wait(600)
  failIfForced()
  call(() => feedback.setReportState(id, next, actor()))
}

export async function addNote(id: string, _author: string, text: string) {
  await wait(500)
  failIfForced()
  const problem = checkText(String(text ?? ''), LIMITS.note, 'Escribe la nota.')
  if (problem) throw new ApiError('invalid', problem)
  call(() => feedback.addReportNote(id, text, actor()))
}

// RF-W28: removed, the review leaves the app and the business average.
export async function decideReview(id: string, decision: ReviewDecision) {
  await wait(700)
  failIfForced()
  call(() => feedback.decideReview(id, decision, actor()))
}

export async function reportReview(id: string, reason: string, detail: string) {
  await wait(700)
  failIfForced()
  const problem = checkText(String(reason ?? ''), LIMITS.reason, 'Elige el motivo.') ?? checkText(String(detail ?? ''), LIMITS.reason)
  if (problem) throw new ApiError('invalid', problem)
  call(() => feedback.reportReview(id, reason, detail, actor()))
}
