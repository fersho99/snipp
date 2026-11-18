// Demo implementation of the branch API (RF-W05 to RF-W09, RNF-W05).
// The panel shell, the branch selector and the branch pages read the same
// store, so a change shows up everywhere at once. In production each
// save is a call to the API, which also optimizes the images before the
// app shows them (RNF-W05).
import { useSyncExternalStore } from 'react'
import { businesses } from '../data/demo'
import { ApiError } from './auth'
import { getDemoEstado } from './panel'
import type { Branch, BusinessSetup, Service, StoredBusiness } from '../types/domain'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const listeners = new Set<() => void>()
const state: Record<string, BusinessSetup> = {}

function ensure(businessId: string, seed?: StoredBusiness | null) {
  if (!state[businessId]) {
    const base = businesses[businessId] ?? seed ?? { branches: [] }
    state[businessId] = { minNoticeHours: base.minNoticeHours ?? 2, branches: base.branches.map((b) => ({ ...b })) }
  }
  return state[businessId]
}
function update(businessId: string, fn: (s: BusinessSetup) => BusinessSetup) {
  state[businessId] = fn(state[businessId])
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

// Live branches and settings of a business. `seed` is the business of a Jefe
// who registered in this session (it is not in the demo data).
export function useBusinessSetup(businessId: string | null, seed?: StoredBusiness | null): BusinessSetup | null {
  if (businessId) ensure(businessId, seed)
  return useSyncExternalStore(subscribe, () => (businessId ? state[businessId] : null))
}

// Screen index only: start again from the demo data, or with no branches.
export function resetDemoBranches(businessId: string | null, empty: boolean) {
  for (const k of Object.keys(state)) delete state[k]
  if (businessId && empty) state[businessId] = { minNoticeHours: 2, branches: [] }
}
export const getBusinessSetup = (businessId: string, seed?: StoredBusiness | null) => ensure(businessId, seed)

function failIfForced() {
  if (getDemoEstado() === 'error-guardar') throw new ApiError('server')
  if (getDemoEstado() === 'sin-conexion-guardar') throw new ApiError('offline')
}

// RNF-W05: JPG or PNG up to 5 MB. Returns an error message or null.
export const MAX_IMAGE_MB = 5
export function imageProblem(file: File) {
  if (!['image/jpeg', 'image/png'].includes(file.type)) return `«${file.name}» no es JPG ni PNG. Sube la foto en uno de esos formatos.`
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `«${file.name}» pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es ${MAX_IMAGE_MB} MB.`
  return null
}

let nextId = 1
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export type BranchForm = Pick<Branch, 'name' | 'address' | 'phone' | 'description' | 'hours' | 'images' | 'coverId'>
export async function createBranch(businessId: string, data: BranchForm) {
  await wait(700)
  failIfForced()
  const branch: Branch = { ...data, id: `${slug(data.name)}-${Date.now()}`, active: true, upcoming: 0, services: [] }
  update(businessId, (s) => ({ ...s, branches: [...s.branches, branch] }))
  return branch
}

export async function saveBranch(businessId: string, branchId: string, data: Partial<Branch>) {
  await wait(700)
  failIfForced()
  update(businessId, (s) => ({ ...s, branches: s.branches.map((b) => (b.id === branchId ? { ...b, ...data } : b)) }))
}

// RF-W09: deactivating keeps every piece of data; reactivating brings it back as it was.
export async function setBranchActive(businessId: string, branchId: string, active: boolean) {
  await wait(600)
  failIfForced()
  update(businessId, (s) => ({ ...s, branches: s.branches.map((b) => (b.id === branchId ? { ...b, active } : b)) }))
}

export async function saveService(businessId: string, branchId: string, service: Omit<Service, 'id'> & { id?: string }): Promise<Service> {
  await wait(600)
  failIfForced()
  const saved: Service = { ...service, id: service.id ?? `svc-${nextId++}` }
  update(businessId, (s) => ({
    ...s,
    branches: s.branches.map((b) => {
      if (b.id !== branchId) return b
      const exists = b.services.some((x) => x.id === saved.id)
      return { ...b, services: exists ? b.services.map((x) => (x.id === saved.id ? saved : x)) : [...b.services, saved] }
    }),
  }))
  return saved
}

export async function saveMinNotice(businessId: string, hours: number) {
  await wait(600)
  failIfForced()
  update(businessId, (s) => ({ ...s, minNoticeHours: hours }))
}
