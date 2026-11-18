// Demo implementation of the account API (RF-W01, RF-W02, RF-W03).
// In production these are calls to the API over HTTPS (RNF-G02); passwords
// are stored hashed (RNF-G01) and expired or invalid tokens are rejected (RNF-G03).
// `estado` lets the screen index force a state (credenciales, correo-registrado, ...).
import { accounts, DEMO_PASSWORD, DEMO_TODAY } from '../data/demo'
import { addMonths } from '../theme'
import type { Session, StoredBusiness } from '../types/domain'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const registered = new Set(accounts.map((a) => a.email))
const KEY = 'snipp-session'

// offline | server | credentials | email-taken | token | card | stripe
export type ApiErrorCode = 'offline' | 'server' | 'credentials' | 'email-taken' | 'token' | 'card' | 'stripe'
export class ApiError extends Error {
  code: ApiErrorCode
  constructor(code: ApiErrorCode) {
    super(code)
    this.code = code
  }
}

// Session kept for the demo only; the real one is a token from the API.
let session: Session | null = null
try {
  session = JSON.parse(sessionStorage.getItem(KEY) ?? 'null')
} catch {
  session = null
}
function save(next: Session | null) {
  session = next
  try {
    if (next) sessionStorage.setItem(KEY, JSON.stringify(next))
    else sessionStorage.clear()
  } catch {
    // Storage blocked (private mode): the session lives in memory only.
  }
}
export const currentSession = (): Session | null => session

// Remembers, for this session, that the overdue-payment message was shown
// at sign-in (RF-W26), so it is not shown again on every page.
export function markOverdueSeen() {
  if (session) save({ ...session, overdueSeen: true })
}

// Screen index only (development): opens the panel as a demo account.
export function devSignIn(email: string) {
  const account = accounts.find((a) => a.email === email)
  if (account) save({ ...account })
}

function fail(estado?: string | null) {
  if (estado === 'sin-conexion') throw new ApiError('offline')
  if (estado === 'error-servidor') throw new ApiError('server')
}

export async function login(email: string, password: string, estado?: string | null) {
  await wait(700)
  fail(estado)
  const account = accounts.find((a) => a.email === email.trim().toLowerCase())
  if (estado === 'credenciales' || !account || password !== DEMO_PASSWORD) throw new ApiError('credentials')
  save({ ...account })
  return account
}

export function logout() {
  save(null)
}

export interface BossForm { name: string; email: string; phone: string; businessName: string; planId: string }
export async function registerBoss({ name, email, phone, businessName, planId }: BossForm, estado?: string | null) {
  await wait(900)
  fail(estado)
  const key = email.trim().toLowerCase()
  if (estado === 'correo-registrado' || registered.has(key)) throw new ApiError('email-taken')
  registered.add(key)
  // The new business starts with its free month and no branches yet (RN-13, RF-W05).
  const business: StoredBusiness = {
    id: `negocio-${Date.now()}`,
    name: businessName.trim(),
    minNoticeHours: 2,
    branches: [],
    subscription: { kind: 'prueba', planId, endsOn: addMonths(DEMO_TODAY, 1).toISOString() },
  }
  const account: Session = { email: key, role: 'jefe', name: name.trim(), phone, planId, businessId: business.id, business }
  save(account)
  return account
}

export async function registerEmployee({ name, email }: { name: string; email: string }, estado?: string | null) {
  await wait(900)
  fail(estado)
  const key = email.trim().toLowerCase()
  if (estado === 'correo-registrado' || registered.has(key)) throw new ApiError('email-taken')
  registered.add(key)
  const account: Session = { email: key, role: 'empleado', name: name.trim(), businessId: null }
  save(account)
  return account
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
  return true
}

// Message for the errors every form can get.
export function networkMessage(err: unknown) {
  const code = typeof err === 'object' && err !== null && 'code' in err ? (err as { code: unknown }).code : null
  if (code === 'offline') return { title: 'No hay conexión a internet', body: 'SNIPP necesita internet. Revisa tu conexión y vuelve a intentar; lo que escribiste sigue aquí.' }
  return { title: 'No pudimos completar la operación', body: 'Hubo un problema con el servidor. Intenta de nuevo en un momento; lo que escribiste sigue aquí.' }
}
