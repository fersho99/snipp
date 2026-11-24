// Sample data for batch W5 (Empleados): profiles, appointment history and
// the businesses an Empleado can ask to migrate to. Work schedules,
// appointments and blocks come from the data shared with the client app
// (frontend/shared/seed.ts). Today is Thursday 12 November 2026, 10:00 am.
import { employees, rng } from '@shared/seed'
import { getData } from '@shared/store'
import type { DirectoryBusiness, HistoryEvent, StaffProfile } from '../types/domain'

// Profile shown in the app and work schedule of each Empleado (RF-W10, RF-W11).
const SPECIALTIES: Record<string, string[]> = { luis: ['Fades', 'Barba'], ramon: ['Corte clásico', 'Navaja'], itzel: ['Recepción'], oscar: ['Fades', 'Diseños'] }
export const staffProfiles: Record<string, StaffProfile> = Object.fromEntries(
  employees.map((e) => [e.id, { displayName: e.name, specialties: SPECIALTIES[e.id] ?? [e.specialty], schedule: e.schedule.map((h) => (h ? [h[0], h[1]] : null)) }]),
)

// Other businesses on SNIPP, for "Solicitar migración" and for an Empleado
// without a business who asks to join one (RF-W10, RF-W12). A suspended
// business does not take requests (RF-W28).
export function directory(): DirectoryBusiness[] {
  const d = getData()
  return d.businesses
    .filter((b) => !b.suspended)
    .map((b) => ({ id: b.id, name: b.name, branches: d.branches.filter((br) => br.businessId === b.id && br.active).map((br) => ({ id: br.id, name: br.name })) }))
    .filter((b) => b.branches.length)
}

// Appointment history per Empleado (RF-W17): each confirmation,
// cancellation and reschedule, with the date and who did it. Generated the
// same every time; the newest first.
const SERVICES = ['Corte clásico', 'Fade', 'Arreglo de barba', 'Corte + barba']
export function historyFor(employeeId: string): HistoryEvent[] {
  const r = rng(`historial-${employeeId}`)
  const events: HistoryEvent[] = []
  let folio = 10300
  for (let d = new Date(2026, 7, 17); d < new Date(2026, 10, 12); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    if (d.getDay() === 0) continue
    const n = r() < 0.55 ? 1 : r() < 0.7 ? 2 : 0
    for (let i = 0; i < n; i++) {
      folio += 1 + Math.floor(r() * 3)
      const x = r()
      const action = x < 0.7 ? 'confirmada' : x < 0.85 ? 'cancelada' : 'reagendada'
      const by = action === 'confirmada' ? (r() < 0.8 ? 'Empleado' : 'Jefe') : r() < 0.6 ? 'cliente' : r() < 0.6 ? 'Jefe' : 'Empleado'
      const hour = 10 + Math.floor(r() * 9)
      events.push({ id: `${employeeId}-${folio}`, folio: `C-${folio}`, service: SERVICES[Math.floor(r() * SERVICES.length)], action, by, on: new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, r() < 0.5 ? 0 : 30) })
    }
  }
  return events.reverse()
}
