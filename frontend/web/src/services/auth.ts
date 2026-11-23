// Demo implementation of the account API (RF-W01, RF-W02, RF-W03, RF-W04)
// on the accounts of the database shared with the client app
// (frontend/shared/auth.ts): passwords are kept hashed (RNF-G01) and the
// session ends after 8 hours (RNF-G03). It is kept in localStorage, so every
// tab of the panel shares it. In production these are calls to the API over
// HTTPS (RNF-G02). `estado` lets the screen index force a state
// (credenciales, correo-registrado, ...).
import * as auth from '@shared/auth'
import * as db from '@shared/store'
import { ApiError as SharedApiError, getData } from '@shared/store'
import type { Account, Appointment } from '@shared/types'
import { checkPassword } from '@shared/validators'
import { businesses } from '../data/demo'
import type { Role, Session, StoredBusiness } from '../types/domain'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Development only: the store API in the browser console, to check that a
// rule broken without the screens is rejected too (Fase 3). Each call acts
// as the account signed in to the app or the panel, like a token would.
//   await snippApi.book({ branchId: 'los-compas-norte', employeeId: 'oscar', serviceId: 'fade', date: '2026-11-13', start: 600 })
//   await snippApi.panelChange('C-10520', { employeeId: 'ramon' })
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const appActor = () => auth.sessionAccount('app')
  const panelActor = () => auth.sessionAccount('panel')
  Object.assign(window, {
    snippApi: {
      data: () => db.getData(),
      book: (input: db.NewAppointment) => db.bookAppointment(input, appActor()),
      clientChange: (folio: string, patch: Partial<Appointment>) => db.updateAppointment(folio, patch, appActor()),
      panelChange: async (folio: string, patch: Partial<Appointment>) => {
        const before = db.getData().appointments.find((a) => a.folio === folio)
        if (!before) throw new SharedApiError('not-found', `No existe la cita ${folio}`)
        db.savePanelChanges([{ ...before, ...patch, folio }], null, panelActor())
        return db.getData().appointments.find((a) => a.folio === folio)
      },
      signUpClient: auth.signUpClient,
    },
  })
}

// offline | server | credentials | email-taken | token | card | stripe, and
// 'invalid' | 'conflict' | 'forbidden' when a rule or a field check of the
// shared store rejected the request (its message says why).
export type ApiErrorCode = 'offline' | 'server' | 'credentials' | 'email-taken' | 'token' | 'card' | 'stripe' | 'invalid' | 'conflict' | 'forbidden'
export class ApiError extends Error {
  code: ApiErrorCode
  constructor(code: ApiErrorCode, message: string = code) {
    super(message)
    this.code = code
  }
}
// The shared store answers with the same codes.
const PASSED = ['credentials', 'email-taken', 'offline', 'invalid', 'conflict', 'forbidden']
function rethrow(err: unknown): never {
  if (err instanceof SharedApiError && PASSED.includes(err.code)) throw new ApiError(err.code as ApiErrorCode, err.message)
  if (err instanceof SharedApiError) throw new ApiError('server')
  throw err
}

// Message of a rejected rule or field check, or null for any other error.
export function ruleMessage(err: unknown) {
  const code = typeof err === 'object' && err !== null && 'code' in err ? (err as { code: unknown }).code : null
  return (code === 'invalid' || code === 'conflict' || code === 'forbidden' || code === 'not-found') && err instanceof Error ? err.message : null
}

// A business registered in the panel is not in the sample data: the panel
// receives it with the session, without branches yet (RF-W05).
function registeredBusiness(id: string): StoredBusiness | undefined {
  const b = getData().businesses.find((x) => x.id === id)
  return b ? { id: b.id, name: b.name, minNoticeHours: 2, branches: [], subscription: { kind: b.subscription.kind, planId: b.subscription.planId, endsOn: `${b.subscription.endsOn}T00:00` } } : undefined
}

// RF-W26: the overdue-payment message was already shown at this sign-in.
const OVERDUE_KEY = 'snipp-panel-overdue-seen'
function overdueSeenBy(): string | null {
  try {
    return localStorage.getItem(OVERDUE_KEY)
  } catch {
    return null
  }
}
function setOverdueSeen(email: string | null) {
  try {
    if (email) localStorage.setItem(OVERDUE_KEY, email)
    else localStorage.removeItem(OVERDUE_KEY)
  } catch {
    // Storage blocked: the message shows again on the next page.
  }
}

// The same account gives the same object, so pages can depend on it.
let cache: { account: Account; overdueSeen: boolean; session: Session } | null = null
function toSession(account: Account): Session {
  const overdueSeen = overdueSeenBy() === account.email
  if (cache?.account === account && cache.overdueSeen === overdueSeen) return cache.session
  const { email, name, phone, businessId, branchId } = account
  const business = businessId && !businesses[businessId] ? registeredBusiness(businessId) : undefined
  const session: Session = { email, name, phone, role: account.role as Role, businessId, ...(branchId ? { branchId } : {}), ...(business ? { business, planId: business.subscription.planId } : {}), overdueSeen }
  cache = { account, overdueSeen, session }
  return session
}

export function currentSession(): Session | null {
  const account = auth.sessionAccount('panel')
  return account ? toSession(account) : null
}

// Remembers, for this sign-in, that the overdue-payment message was shown
// (RF-W26), so it is not shown again on every page.
export function markOverdueSeen() {
  const account = auth.sessionAccount('panel')
  if (account) setOverdueSeen(account.email)
}

// Screen index only (development): opens the panel as a demo account.
export function devSignIn(email: string) {
  setOverdueSeen(null)
  auth.devSignIn('panel', email)
}

function fail(estado?: string | null) {
  if (estado === 'sin-conexion') throw new ApiError('offline')
  if (estado === 'error-servidor') throw new ApiError('server')
}

export async function login(email: string, password: string, estado?: string | null) {
  await wait(100)
  fail(estado)
  if (estado === 'credenciales') throw new ApiError('credentials')
  setOverdueSeen(null)
  try {
    return toSession(await auth.signIn('panel', email, password))
  } catch (err) {
    rethrow(err)
  }
}

export function logout() {
  setOverdueSeen(null)
  auth.signOut('panel')
}

export interface BossForm { name: string; email: string; phone: string; password: string; businessName: string; planId: string }
export async function registerBoss(form: BossForm, estado?: string | null) {
  await wait(100)
  fail(estado)
  if (estado === 'correo-registrado') throw new ApiError('email-taken')
  try {
    return toSession(await auth.signUpBoss(form))
  } catch (err) {
    rethrow(err)
  }
}

export async function registerEmployee(form: { name: string; email: string; phone?: string; password: string }, estado?: string | null) {
  await wait(100)
  fail(estado)
  if (estado === 'correo-registrado') throw new ApiError('email-taken')
  try {
    return toSession(await auth.signUpEmployee({ ...form, phone: form.phone ?? '' }))
  } catch (err) {
    rethrow(err)
  }
}

// Always answers the same way, whether or not the email has an account,
// so nobody can find out which emails are registered.
export async function requestReset(email: string, estado?: string | null) {
  await wait(800)
  fail(estado)
  return { email }
}

export async function resetPassword(token: string | null, password: string, estado?: string | null) {
  await wait(800)
  fail(estado)
  if (estado === 'enlace-vencido' || !token) throw new ApiError('token')
  const invalid = checkPassword(String(password ?? ''))
  if (invalid) throw new ApiError('invalid', invalid)
  return true
}

// Message for the errors every form can get.
export function networkMessage(err: unknown) {
  const code = typeof err === 'object' && err !== null && 'code' in err ? (err as { code: unknown }).code : null
  const rule = ruleMessage(err)
  if (rule) return { title: 'Revisa los datos', body: rule }
  if (code === 'offline') return { title: 'No hay conexión a internet', body: 'SNIPP necesita internet. Revisa tu conexión y vuelve a intentar; lo que escribiste sigue aquí.' }
  return { title: 'No pudimos completar la operación', body: 'Hubo un problema con el servidor. Intenta de nuevo en un momento; lo que escribiste sigue aquí.' }
}
