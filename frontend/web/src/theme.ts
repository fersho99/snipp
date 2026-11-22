// Formatting helpers shared by every screen (es-MX).
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export const money = (n: number) => `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
// The year is only written when it is not the current one (demo: 2026).
const CURRENT_YEAR = 2026
const year = (d: Date) => (d.getFullYear() === CURRENT_YEAR ? '' : ` de ${d.getFullYear()}`)
export const longDate = (d: Date) => `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}${year(d)}`
export const dayMonth = (d: Date) => `${d.getDate()} de ${MONTHS[d.getMonth()]}${year(d)}`
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate())
// The same check the app and the shared store use (shared/validators.ts).
export { isEmail } from '@shared/validators'
export const firstName = (s: string) => s.trim().split(/\s+/)[0] ?? ''
export const timeOfDay = (d: Date) => {
  const h = d.getHours() % 12 || 12
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'am' : 'pm'}`
}
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
// <input type="date"> values (YYYY-MM-DD), read and written in local time.
export const toInputDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const fromInputDate = (s: string): Date | null => {
  const [y, m, d] = s.split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d) : null
}
export const count = (n: number, one: string, many: string) => `${n.toLocaleString('es-MX')} ${n === 1 ? one : many}`
