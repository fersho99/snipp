// Accounts and sessions of the simulated database (RF-M01, RF-W01 to
// RF-W04, RNF-G01, RNF-G03). The client app and the panel keep separate
// sessions, so Andrea can use the app in one tab while the Jefe uses the
// panel in another. A session lasts 8 hours; then it has to sign in again.
// In production the API checks the password and issues a token instead.
import { DEMO_TODAY, iso } from './dates'
import { hashPassword } from './seed'
import { sha256 } from './sha256'
import { ApiError, commit, getData } from './store'
import type { Account, Role } from './types'

export type Platform = 'app' | 'panel'
export const SESSION_HOURS = 8
const KEYS: Record<Platform, string> = { app: 'snipp-session-app', panel: 'snipp-session-panel' }
// Roles each platform accepts: the app is for clients, the panel for the rest.
const ROLES: Record<Platform, Role[]> = { app: ['cliente'], panel: ['admin', 'jefe', 'empleado'] }

interface Saved {
  email: string
  expiresAt: number
}

const memory: Record<Platform, Saved | null> = { app: null, panel: null }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function read(platform: Platform): Saved | null {
  const store = storage()
  if (!store) return memory[platform]
  try {
    return JSON.parse(store.getItem(KEYS[platform]) ?? 'null') as Saved | null
  } catch {
    return null
  }
}

function write(platform: Platform, saved: Saved | null) {
  memory[platform] = saved
  try {
    if (saved) storage()?.setItem(KEYS[platform], JSON.stringify(saved))
    else storage()?.removeItem(KEYS[platform])
  } catch {
    // Storage blocked: the session lives in memory for this tab.
  }
  emit()
}

// The signed-in account, or null when there is no session, it expired
// (RNF-G03) or the account no longer exists (for example after a reset).
export function sessionAccount(platform: Platform): Account | null {
  const saved = read(platform)
  if (!saved) return null
  const account = getData().accounts.find((a) => a.email === saved.email)
  if (saved.expiresAt <= Date.now() || !account || !ROLES[platform].includes(account.role)) {
    write(platform, null)
    return null
  }
  return account
}

export function onSessionChange(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Another tab signed in or out.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e) => {
    if (e.key === null || Object.values(KEYS).includes(e.key)) emit()
  })
}

const start = (platform: Platform, email: string) => write(platform, { email, expiresAt: Date.now() + SESSION_HOURS * 3600 * 1000 })
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const normalized = (email: string) => email.trim().toLowerCase()

export async function signIn(platform: Platform, email: string, password: string): Promise<Account> {
  await wait(600)
  const account = getData().accounts.find((a) => a.email === normalized(email))
  // The same answer for a wrong email or a wrong password, so nobody can
  // find out which emails have an account.
  if (!account || !ROLES[platform].includes(account.role) || hashPassword(account.salt, password) !== account.passwordHash) throw new ApiError('credentials')
  start(platform, account.email)
  return account
}

export function signOut(platform: Platform) {
  write(platform, null)
}

// Development only (screen index): opens a session without the password.
export function devSignIn(platform: Platform, email: string) {
  if (getData().accounts.some((a) => a.email === email)) start(platform, email)
}

function newSalt() {
  const bytes = new Uint8Array(8)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') crypto.getRandomValues(bytes)
  else bytes.forEach((_, i) => (bytes[i] = Math.floor(Math.random() * 256)))
  return sha256(Array.from(bytes).join(',')).slice(0, 16)
}

interface SignUp {
  name: string
  email: string
  phone: string
  password: string
}

function createAccount(platform: Platform, role: Role, form: SignUp, businessId: string | null) {
  const email = normalized(form.email)
  if (getData().accounts.some((a) => a.email === email)) throw new ApiError('email-taken')
  const salt = newSalt()
  const account: Account = { email, role, name: form.name.trim(), phone: form.phone.trim(), businessId, branchId: null, salt, passwordHash: hashPassword(salt, form.password) }
  commit((d) => ({ ...d, accounts: [...d.accounts, account] }))
  start(platform, email)
  return account
}

// RF-M01: a client account for the app.
export async function signUpClient(form: SignUp) {
  await wait(800)
  return createAccount('app', 'cliente', form, null)
}

// RF-W02: an Empleado without a business; they ask to join one later.
export async function signUpEmployee(form: SignUp) {
  await wait(800)
  return createAccount('panel', 'empleado', form, null)
}

// RF-W01: the Jefe registers with their business, which starts with a free
// month on the plan they chose and no branches yet (RN-13, RF-W05).
export async function signUpBoss(form: SignUp & { businessName: string; planId: string }) {
  await wait(800)
  if (getData().accounts.some((a) => a.email === normalized(form.email))) throw new ApiError('email-taken')
  const businessId = `negocio-${Date.now()}`
  const endsOn = new Date(DEMO_TODAY.getFullYear(), DEMO_TODAY.getMonth() + 1, DEMO_TODAY.getDate())
  commit((d) => ({
    ...d,
    businesses: [...d.businesses, { id: businessId, name: form.businessName.trim(), kind: '', subscription: { kind: 'prueba', planId: form.planId, endsOn: iso(endsOn) }, suspended: false }],
  }))
  return createAccount('panel', 'jefe', form, businessId)
}
