// Formatting helpers shared by every screen (es-MX).
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export const money = (n) => `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
export const longDate = (d) => `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`
export const dayMonth = (d) => `${d.getDate()} de ${MONTHS[d.getMonth()]}`
export const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate())
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())
export const firstName = (s) => s.trim().split(/\s+/)[0] ?? ''
