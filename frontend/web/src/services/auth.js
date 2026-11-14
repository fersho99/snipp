// Demo implementation of the account API (RF-W01, RF-W02, RF-W03).
// In production these are calls to the API over HTTPS (RNF-G02); passwords
// are stored hashed (RNF-G01) and expired or invalid tokens are rejected (RNF-G03).
// `estado` lets the screen index force a state (credenciales, correo-registrado, ...).
import { accounts, DEMO_PASSWORD } from '../data/demo'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const registered = new Set(accounts.map((a) => a.email))
const KEY = 'snipp-session'

export class ApiError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

// Session kept for the demo only; the real one is a token from the API.
let session = null
try {
  session = JSON.parse(sessionStorage.getItem(KEY) ?? 'null')
} catch {
  session = null
}
function save(next) {
  session = next
  try {
    if (next) sessionStorage.setItem(KEY, JSON.stringify(next))
    else sessionStorage.clear()
  } catch {
    // Storage blocked (private mode): the session lives in memory only.
  }
}
export const currentSession = () => session

function fail(estado) {
  if (estado === 'sin-conexion') throw new ApiError('offline')
  if (estado === 'error-servidor') throw new ApiError('server')
}

export async function login(email, password, estado) {
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

export async function registerBoss({ name, email, phone, businessName, planId }, estado) {
  await wait(900)
  fail(estado)
  const key = email.trim().toLowerCase()
  if (estado === 'correo-registrado' || registered.has(key)) throw new ApiError('email-taken')
  registered.add(key)
  const account = { email: key, role: 'jefe', name: name.trim(), phone, business: businessName.trim(), planId }
  save(account)
  return account
}

export async function registerEmployee({ name, email }, estado) {
  await wait(900)
  fail(estado)
  const key = email.trim().toLowerCase()
  if (estado === 'correo-registrado' || registered.has(key)) throw new ApiError('email-taken')
  registered.add(key)
  const account = { email: key, role: 'empleado', name: name.trim(), business: null }
  save(account)
  return account
}

// Always answers the same way, whether or not the email has an account,
// so nobody can find out which emails are registered.
export async function requestReset(email, estado) {
  await wait(800)
  fail(estado)
  return { email }
}

export async function resetPassword(token, password, estado) {
  await wait(800)
  fail(estado)
  if (estado === 'enlace-vencido' || !token) throw new ApiError('token')
  return true
}

// Message for the errors every form can get.
export function networkMessage(err) {
  if (err?.code === 'offline') return { title: 'No hay conexión a internet', body: 'SNIPP necesita internet. Revisa tu conexión y vuelve a intentar; lo que escribiste sigue aquí.' }
  return { title: 'No pudimos completar la operación', body: 'Hubo un problema con el servidor. Intenta de nuevo en un momento; lo que escribiste sigue aquí.' }
}
