// Formatting helpers shared by every screen (es-MX).
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export const money = (n) => `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
export const longDate = (d) => `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`
export const dayMonth = (d) => `${d.getDate()} de ${MONTHS[d.getMonth()]}`
export const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate())
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())
export const firstName = (s) => s.trim().split(/\s+/)[0] ?? ''
export const timeOfDay = (d) => {
  const h = d.getHours() % 12 || 12
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'am' : 'pm'}`
}
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
// <input type="date"> values (YYYY-MM-DD), read and written in local time.
export const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const fromInputDate = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d) : null
}
export const count = (n, one, many) => `${n.toLocaleString('es-MX')} ${n === 1 ? one : many}`
