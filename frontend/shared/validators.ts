// Field checks shared by the client app and the web panel (SRS v1.2, 4.2
// "Errores de formulario"). Each check returns the message shown in red
// under the field, or null when the value is fine. The simulated database
// runs the same checks again, so a value sent from the browser console is
// rejected too. The real API must repeat them (see frontend/README.md).
import { DEMO_TODAY, fromIso, iso, minutesOf } from './dates'

// Longest value each kind of field accepts: the input's maxLength and the check.
export const LIMITS = {
  name: 60,
  email: 254,
  phone: 10,
  password: 64,
  businessName: 80,
  branchName: 80,
  address: 120,
  neighborhood: 60,
  description: 500,
  specialty: 40,
  serviceName: 60,
  productName: 80,
  size: 30,
  sku: 30,
  review: 500,
  report: 800,
  note: 300,
  reason: 200,
  search: 60,
  code: 12,
  price: 7, // digits typed, up to 99,999.99
  stock: 5, // digits typed, up to 99,999
} as const

export const MAX_PRICE = 99999
export const MAX_STOCK = 99999
export const MIN_PASSWORD = 8
// RN-02: appointments up to two months ahead.
export const BOOKING_MONTHS = 2
// RNF-W05: JPG or PNG images up to 5 MB.
export const IMAGE_TYPES = ['image/jpeg', 'image/png']
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export type Check = string | null

const tooLong = (value: string, max: number) => (value.length > max ? `Usa como máximo ${max} caracteres.` : null)

// Free text (descriptions, reviews, notes): optional unless `required`, and
// never longer than its limit. It is kept and shown as text, never as HTML.
export function checkText(value: string, max: number, required?: string): Check {
  if (required && !value.trim()) return required
  return tooLong(value, max)
}

// Letters with Spanish accents, ñ and ü.
const L = 'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF'
// Names of people: letters, spaces, apostrophes, dots and dashes.
const NAME = new RegExp(`^[${L}][${L} .'-]*$`)
export function checkName(value: string, empty = 'Escribe tu nombre.'): Check {
  const v = value.trim()
  if (!v) return empty
  if (v.length < 2) return 'Escribe al menos 2 letras.'
  if (v.length > LIMITS.name) return tooLong(v, LIMITS.name)
  if (!NAME.test(v)) return 'Usa solo letras, espacios, puntos, apóstrofos o guiones.'
  return null
}

// Names of businesses, branches, services and products may have digits and
// a few signs ("Barbería 24/7", "Cera mate 100 g"), but no <, > or quotes.
const LABEL = new RegExp(`^[${L}0-9][${L}0-9 .,'&/()#+°-]*$`)
export function checkLabel(value: string, max: number, empty: string): Check {
  const v = value.trim()
  if (!v) return empty
  if (v.length > max) return tooLong(v, max)
  if (!LABEL.test(v)) return 'Usa letras, números, espacios y solo estos signos: . , \' & / ( ) # + -'
  return null
}

export const isEmail = (value: string) => {
  const v = value.trim()
  return v.length <= LIMITS.email && /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(v)
}
export function checkEmail(value: string): Check {
  if (!value.trim()) return 'Escribe tu correo.'
  if (value.trim().length > LIMITS.email) return tooLong(value.trim(), LIMITS.email)
  return isEmail(value) ? null : 'Escribe tu correo completo, por ejemplo nombre@gmail.com.'
}

// Mexican mobile number, 10 digits without +52. Spaces and dashes are ignored.
export const phoneDigits = (value: string) => value.replace(/[\s-]/g, '')
export function checkPhone(value: string): Check {
  const v = phoneDigits(value)
  if (!v) return 'Escribe tu teléfono.'
  return /^\d{10}$/.test(v) ? null : 'El teléfono debe tener 10 dígitos, sin el +52.'
}

// New passwords (sign-up, reset). Signing in only checks it is not empty.
export function checkPassword(value: string): Check {
  if (value.length < MIN_PASSWORD) return `Usa al menos ${MIN_PASSWORD} caracteres.`
  if (value.length > LIMITS.password) return tooLong(value, LIMITS.password)
  if (!new RegExp(`[${L}]`).test(value) || !/\d/.test(value)) return 'Usa al menos una letra y un número.'
  return null
}

// Amounts typed by hand: "180", "180.50". Only digits and one decimal point.
export const parseAmount = (value: string | number) => {
  if (typeof value === 'number') return value
  const v = value.trim().replace(/,/g, '')
  return /^\d+(\.\d{1,2})?$/.test(v) ? Number(v) : NaN
}
export function checkPrice(value: string | number): Check {
  const n = parseAmount(value)
  if (Number.isNaN(n)) return 'Escribe el precio solo con números, por ejemplo 180 o 180.50.'
  if (n <= 0) return 'El precio debe ser mayor que 0.'
  if (n > MAX_PRICE) return `El precio no puede pasar de $${MAX_PRICE.toLocaleString('es-MX')}.`
  return null
}

export function checkStock(value: string | number): Check {
  const n = typeof value === 'number' ? value : /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN
  if (!Number.isInteger(n) || n < 0) return 'Escribe las piezas como número entero, 0 o más.'
  if (n > MAX_STOCK) return `No puede pasar de ${MAX_STOCK.toLocaleString('es-MX')} piezas.`
  return null
}

// Opening or work hours "HH:MM": the start goes before the end.
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
export function checkHours(from: string, to: string): Check {
  if (!HHMM.test(from) || !HHMM.test(to)) return 'Elige la hora de inicio y la de fin.'
  return minutesOf(from) < minutesOf(to) ? null : 'La hora de inicio debe ser antes que la de fin.'
}

// RN-02: from today up to two months ahead. date: "YYYY-MM-DD".
export function lastBookableDay(today = DEMO_TODAY) {
  return new Date(today.getFullYear(), today.getMonth() + BOOKING_MONTHS, today.getDate())
}
export function checkBookingDate(date: string, today = DEMO_TODAY): Check {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || iso(fromIso(date)) !== date) return 'Elige una fecha válida.'
  if (date < iso(today)) return 'Elige una fecha de hoy en adelante.'
  if (date > iso(lastBookableDay(today))) return `Solo se reserva hasta ${BOOKING_MONTHS} meses adelante.`
  return null
}

// RNF-W05.
export function checkImage(file: { type: string; size: number }): Check {
  if (!IMAGE_TYPES.includes(file.type)) return 'Usa una imagen JPG o PNG.'
  if (file.size > MAX_IMAGE_BYTES) return 'La imagen pesa más de 5 MB. Usa una más ligera.'
  return null
}

// Search boxes: cut to the limit; the text is only compared, never run.
export const cleanSearch = (value: string) => value.slice(0, LIMITS.search).trim().toLowerCase()

// Runs several checks and keeps the ones that failed: { field: message }.
export function collect<K extends string>(checks: Record<K, Check>): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {}
  for (const key of Object.keys(checks) as K[]) {
    const message = checks[key]
    if (message) out[key] = message
  }
  return out
}
