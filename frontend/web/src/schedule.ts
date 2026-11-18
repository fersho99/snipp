// Work schedules: summaries and validation (RF-W10). Days go Sunday (0) to Saturday (6).
import { timeOfDay } from './theme'
import type { WeekHours } from './types/domain'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

// "10:00" -> "10:00 am", "20:00" -> "8:00 pm"
export const hhmm = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return timeOfDay(new Date(2026, 0, 1, h, m))
}

// "Lun a vie, 12:00 pm a 8:00 pm · Sáb, 10:00 am a 6:00 pm"
export function scheduleSummary(schedule: WeekHours) {
  const runs: { from: number; to: number; v: [string, string] }[] = []
  for (const d of WEEK_ORDER) {
    const v = schedule[d]
    const last = runs[runs.length - 1]
    if (v && last && last.v && last.v[0] === v[0] && last.v[1] === v[1] && WEEK_ORDER.indexOf(d) === WEEK_ORDER.indexOf(last.to) + 1) last.to = d
    else if (v) runs.push({ from: d, to: d, v })
  }
  if (!runs.length) return 'Sin horario asignado'
  return runs
    .map((r) => {
      const days = r.from === r.to ? SHORT[r.from] : `${SHORT[r.from]} a ${SHORT[r.to]}`
      return `${days[0].toUpperCase()}${days.slice(1)}, ${hhmm(r.v[0])} a ${hhmm(r.v[1])}`
    })
    .join(' · ')
}

export const scheduleProblem = (schedule: WeekHours) => {
  const toMin = (t: string) => Number(t.split(':')[0]) * 60 + Number(t.split(':')[1])
  const bad = schedule.findIndex((h) => h && (!h[0] || !h[1] || toMin(h[1]) <= toMin(h[0])))
  if (bad >= 0) return `Revisa el ${DAY_NAMES[bad].toLowerCase()}: la hora de salida debe ser después de la de entrada.`
  if (schedule.every((h) => !h)) return 'Marca al menos un día de trabajo.'
  return null
}

