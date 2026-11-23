// Demo implementation of the branch API (RF-W05 to RF-W09, RNF-W05) on the
// database shared with the client app (frontend/shared/catalog.ts): a
// branch or service registered here shows up in the app right away. The
// panel shell, the branch selector and the branch pages read the same
// store. In production each save is a call to the API, which also
// optimizes the images before the app shows them (RNF-W05).
import { useSyncExternalStore } from 'react'
import { sessionAccount } from '@shared/auth'
import * as catalog from '@shared/catalog'
import { ApiError as SharedApiError, getData, subscribe as onDataChange } from '@shared/store'
import type { DemoData } from '@shared/types'
import { panelBranch } from '../data/demo'
import { ApiError } from './auth'
import { takeForcedError } from './panel'
import type { Branch, BranchImage, BusinessSetup, Service } from '../types/domain'
import { IMAGE_TYPES, LIMITS, MAX_IMAGE_BYTES, checkHours, checkLabel, checkPhone, checkPrice, checkText } from '@shared/validators'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  const off = onDataChange(l)
  return () => {
    listeners.delete(l)
    off()
  }
}

// Photos uploaded in this tab, by branch (they are files of this browser).
const photos: Record<string, { images: BranchImage[]; coverId: string | null }> = {}
// Screen index only: a business shown without branches.
let emptyBusiness: string | null = null

let cache: { data: DemoData; photos: typeof photos; emptyBusiness: string | null; setups: Record<string, BusinessSetup> } | null = null
function setupOf(businessId: string): BusinessSetup {
  const data = getData()
  if (!cache || cache.data !== data || cache.photos !== photos || cache.emptyBusiness !== emptyBusiness) cache = { data, photos, emptyBusiness, setups: {} }
  if (!cache.setups[businessId]) {
    const b = data.businesses.find((x) => x.id === businessId)
    const branches = emptyBusiness === businessId ? [] : data.branches.filter((br) => br.businessId === businessId).map((br) => ({ ...panelBranch(data, br), ...(photos[br.id] ?? {}) }))
    cache.setups[businessId] = { minNoticeHours: b?.minNoticeHours ?? 2, branches }
  }
  return cache.setups[businessId]
}

// Live branches and settings of a business.
export function useBusinessSetup(businessId: string | null): BusinessSetup | null {
  return useSyncExternalStore(subscribe, () => (businessId ? setupOf(businessId) : null), () => (businessId ? setupOf(businessId) : null))
}

// Screen index only: show the business without branches, or as it is.
export function resetDemoBranches(businessId: string | null, empty: boolean) {
  emptyBusiness = empty ? businessId : null
  cache = null
  emit()
}
export const getBusinessSetup = (businessId: string) => setupOf(businessId)

// The shared store answers with a code and a message; the panel shows it.
async function call<T>(fn: () => T): Promise<T> {
  try {
    return fn()
  } catch (err) {
    if (err instanceof SharedApiError) throw new ApiError(err.code === 'not-found' ? 'invalid' : (err.code as 'invalid' | 'conflict' | 'forbidden'), err.message)
    throw err
  }
}
const actor = () => sessionAccount('panel')
function setPhotos(branchId: string, data: { images?: BranchImage[]; coverId?: string | null }) {
  if (data.images === undefined && data.coverId === undefined) return
  const current = photos[branchId] ?? { images: [], coverId: null }
  photos[branchId] = { images: data.images ?? current.images, coverId: data.coverId === undefined ? current.coverId : data.coverId }
  cache = null
  emit()
}
// "Calle 5 y Av. Obregón, Col. Centro": the street, and the neighborhood after the last comma.
function splitAddress(address: string) {
  const i = address.lastIndexOf(',')
  return i > 0 ? { address: address.slice(0, i).trim(), neighborhood: address.slice(i + 1).trim() } : { address: address.trim(), neighborhood: '' }
}

function failIfForced() {
  const e = takeForcedError('error-guardar', 'sin-conexion-guardar')
  if (e === 'error-guardar') throw new ApiError('server')
  if (e === 'sin-conexion-guardar') throw new ApiError('offline')
}

// RNF-W05: JPG or PNG up to 5 MB. Returns an error message or null.
export const MAX_IMAGE_MB = MAX_IMAGE_BYTES / 1024 / 1024
export function imageProblem(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) return `«${file.name}» no es JPG ni PNG. Sube la foto en uno de esos formatos.`
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `«${file.name}» pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es ${MAX_IMAGE_MB} MB.`
  return null
}

export type BranchForm = Pick<Branch, 'name' | 'address' | 'phone' | 'description' | 'hours' | 'images' | 'coverId'>
// The same checks as the forms, again here: a request sent without the
// screen is rejected too (RF-W05, RF-W06).
function check(...messages: (string | null)[]) {
  const first = messages.find(Boolean)
  if (first) throw new ApiError('invalid', first)
}
function checkBranch(data: Partial<BranchForm>) {
  check(
    data.name === undefined ? null : checkLabel(String(data.name), LIMITS.branchName, 'Escribe el nombre de la sucursal.'),
    data.address === undefined ? null : checkText(String(data.address), LIMITS.address, 'Escribe la dirección.'),
    data.phone === undefined ? null : checkPhone(String(data.phone)),
    data.description === undefined ? null : checkText(String(data.description), LIMITS.description),
    ...(data.hours ?? []).map((h) => (h ? checkHours(h[0], h[1]) : null)),
  )
}

export async function createBranch(businessId: string, data: BranchForm) {
  await wait(700)
  failIfForced()
  checkBranch(data)
  const created = await call(() => catalog.createBranch(businessId, { name: data.name.trim(), ...splitAddress(data.address), phone: data.phone.trim(), description: data.description.trim(), hours: data.hours }, actor()))
  setPhotos(created.id, { images: data.images, coverId: data.coverId })
  return setupOf(businessId).branches.find((b) => b.id === created.id) as Branch
}

export async function saveBranch(businessId: string, branchId: string, data: Partial<Branch>) {
  await wait(700)
  failIfForced()
  checkBranch(data)
  const { images, coverId, address, ...rest } = data
  await call(() => catalog.updateBranch(branchId, { ...rest, ...(address !== undefined ? splitAddress(address) : {}) }, actor()))
  setPhotos(branchId, { images, coverId })
}

// RF-W09: deactivating keeps every piece of data; reactivating brings it back as it was.
export async function setBranchActive(businessId: string, branchId: string, active: boolean) {
  await wait(600)
  failIfForced()
  await call(() => catalog.setBranchActive(branchId, active, actor()))
}

export async function saveService(businessId: string, branchId: string, service: Omit<Service, 'id'> & { id?: string }): Promise<Service> {
  await wait(600)
  failIfForced()
  check(
    checkLabel(String(service.name ?? ''), LIMITS.serviceName, 'Escribe el nombre del servicio.'),
    checkText(String(service.description ?? ''), LIMITS.description),
    Number.isInteger(service.minutes) && service.minutes >= 5 && service.minutes <= 480 ? null : 'La duración va de 5 a 480 minutos, en número entero.',
    checkPrice(service.price),
  )
  const saved = await call(() => catalog.saveService(branchId, service, actor()))
  return { ...saved, active: service.active }
}

export async function saveMinNotice(businessId: string, hours: number) {
  await wait(600)
  failIfForced()
  await call(() => catalog.saveMinNotice(businessId, hours, actor()))
}
