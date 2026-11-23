// Simulated database shared by the client app and the web panel. It lives in
// the browser's localStorage, so both see the same records when the app is
// served from the web (localhost:3000/app) and the data survives a reload.
// On a phone, or where storage is blocked, it lives in memory only.
//
// The functions at the end have the shape of the real API (async, errors with
// a `code`), so connecting the API later only changes their implementation.
import { seedData } from './seed'
import type { Appointment, DemoData } from './types'

const KEY = 'snipp-demo'
// Raise it whenever the shape of DemoData or the sample data changes: saved
// data from another version is replaced by the new sample data.
export const SCHEMA_VERSION = 1

interface Saved {
  version: number
  data: DemoData
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function read(): DemoData | null {
  try {
    const saved = JSON.parse(storage()?.getItem(KEY) ?? 'null') as Saved | null
    return saved && saved.version === SCHEMA_VERSION ? saved.data : null
  } catch {
    return null
  }
}

function save(next: DemoData) {
  try {
    storage()?.setItem(KEY, JSON.stringify({ version: SCHEMA_VERSION, data: next } satisfies Saved))
  } catch {
    // Storage full or blocked: the change stays in memory for this tab.
  }
}

let data: DemoData | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

// The current records. The same object is returned until something changes,
// as useSyncExternalStore expects.
export function getData(): DemoData {
  if (!data) {
    data = read()
    if (!data) {
      data = seedData()
      save(data)
    }
  }
  return data
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Applies a change, saves it and tells every screen.
export function commit(fn: (d: DemoData) => DemoData) {
  data = fn(getData())
  save(data)
  emit()
}

// "Reiniciar datos de demo": back to the sample data.
export function resetDemoData() {
  data = seedData()
  save(data)
  emit()
}

// Another tab (the app or the panel) changed the data: reload it.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY && e.key !== null) return
    data = null
    emit()
  })
}

// ------------------------------------------------------------------- API

export type ApiErrorCode = 'not-found' | 'conflict' | 'invalid' | 'forbidden' | 'server' | 'offline'
export class ApiError extends Error {
  code: ApiErrorCode
  constructor(code: ApiErrorCode, message: string = code) {
    super(message)
    this.code = code
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Next free folio, "C-10561".
export function nextFolio(d: DemoData) {
  const max = Math.max(0, ...d.appointments.map((a) => Number(a.folio.slice(2)) || 0))
  return `C-${max + 1}`
}

export async function listAppointments(filter: { clientEmail?: string; branchId?: string; employeeId?: string } = {}): Promise<Appointment[]> {
  await wait(150)
  return getData().appointments.filter(
    (a) => (!filter.clientEmail || a.clientEmail === filter.clientEmail) && (!filter.branchId || a.branchId === filter.branchId) && (!filter.employeeId || a.employeeId === filter.employeeId),
  )
}

export type NewAppointment = Pick<Appointment, 'branchId' | 'employeeId' | 'serviceId' | 'date' | 'start' | 'clientName' | 'clientEmail'>
export async function bookAppointment(input: NewAppointment): Promise<Appointment> {
  await wait(300)
  return insertAppointment(input)
}

export async function updateAppointment(folio: string, patch: Partial<Omit<Appointment, 'folio'>>): Promise<Appointment> {
  await wait(300)
  return patchAppointment(folio, patch)
}

// Synchronous versions for the screens that still change the data right
// away. They will go once every screen awaits the API functions above.
export function insertAppointment(input: NewAppointment): Appointment {
  const created: Appointment = { ...input, folio: nextFolio(getData()), status: 'confirmada' }
  commit((d) => ({ ...d, appointments: [...d.appointments, created] }))
  return created
}

export function patchAppointment(folio: string, patch: Partial<Omit<Appointment, 'folio'>>): Appointment {
  const found = getData().appointments.find((a) => a.folio === folio)
  if (!found) throw new ApiError('not-found', `No existe la cita ${folio}`)
  const next = { ...found, ...patch }
  commit((d) => ({ ...d, appointments: d.appointments.map((a) => (a.folio === folio ? next : a)) }))
  return next
}
