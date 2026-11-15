// Sample data for batch W5 (Empleados): work schedules, upcoming
// appointments, appointment history and the businesses an Empleado can ask
// to migrate to. Same story as the rest of the demo: today is Thursday
// 12 November 2026, 10:00 am.

// Work schedule per weekday, Sunday first (0) to Saturday (6). null = day off.
const week = (open, close, satClose = '18:00') => [null, [open, close], [open, close], [open, close], [open, close], [open, close], ['10:00', satClose]]

// Profile and schedule of each Empleado (RF-W10, RF-W11). The base list of
// employees (name, branch, bookable) is in demo.js.
export const staffProfiles = {
  luis: { displayName: 'Luis Ortega', specialties: ['Fades', 'Barba'], schedule: week('10:00', '18:00') },
  ramon: { displayName: 'Ramón Cázares', specialties: ['Corte clásico', 'Navaja'], schedule: week('12:00', '20:00') },
  itzel: { displayName: 'Itzel Duarte', specialties: ['Recepción'], schedule: week('10:00', '20:00') },
  oscar: { displayName: 'Óscar Félix', specialties: ['Fades', 'Diseños'], schedule: week('10:00', '20:00') },
}

// Appointments booked from now on, per Empleado. Used to propose who takes
// each one when an Empleado migrates or is unlinked (RF-W12, RF-W13, RN-11).
const at = (day, time) => {
  const [h, m] = time.split(':').map(Number)
  return new Date(2026, 10, day, h, m)
}
export const upcomingAppointments = [
  { folio: 'C-10521', employeeId: 'ramon', branchId: 'los-compas-centro', service: 'Corte clásico', minutes: 40, start: at(12, '12:00') },
  { folio: 'C-10533', employeeId: 'ramon', branchId: 'los-compas-centro', service: 'Corte + barba', minutes: 60, start: at(13, '16:00') },
  { folio: 'C-10538', employeeId: 'ramon', branchId: 'los-compas-centro', service: 'Fade', minutes: 45, start: at(14, '11:00') },
  { folio: 'C-10540', employeeId: 'ramon', branchId: 'los-compas-centro', service: 'Corte clásico', minutes: 40, start: at(14, '13:00') },
  { folio: 'C-10547', employeeId: 'ramon', branchId: 'los-compas-centro', service: 'Arreglo de barba', minutes: 25, start: at(17, '18:30') },
  { folio: 'C-10552', employeeId: 'ramon', branchId: 'los-compas-centro', service: 'Corte + barba', minutes: 60, start: at(19, '13:00') },
  { folio: 'C-10519', employeeId: 'luis', branchId: 'los-compas-centro', service: 'Fade', minutes: 45, start: at(12, '12:00') },
  { folio: 'C-10497', employeeId: 'luis', branchId: 'los-compas-centro', service: 'Fade', minutes: 45, start: at(12, '17:00') },
  { folio: 'C-10539', employeeId: 'luis', branchId: 'los-compas-centro', service: 'Corte + barba', minutes: 60, start: at(14, '13:00') },
  { folio: 'C-10544', employeeId: 'luis', branchId: 'los-compas-centro', service: 'Arreglo de barba', minutes: 25, start: at(16, '11:00') },
  { folio: 'C-10549', employeeId: 'luis', branchId: 'los-compas-centro', service: 'Fade', minutes: 45, start: at(18, '15:00') },
  { folio: 'C-10530', employeeId: 'oscar', branchId: 'los-compas-norte', service: 'Fade', minutes: 45, start: at(13, '12:00') },
  { folio: 'C-10536', employeeId: 'oscar', branchId: 'los-compas-norte', service: 'Corte clásico', minutes: 40, start: at(14, '10:00') },
  { folio: 'C-10545', employeeId: 'oscar', branchId: 'los-compas-norte', service: 'Corte + barba', minutes: 60, start: at(16, '17:30') },
]

// Other businesses on SNIPP, for "Solicitar migración" and for an Empleado
// without a business who asks to join one (RF-W10, RF-W12).
export const directory = [
  { id: 'los-compas', name: 'Barbería Los Compas', branches: [{ id: 'los-compas-centro', name: 'Los Compas Centro' }, { id: 'los-compas-norte', name: 'Los Compas Norte' }] },
  { id: 'estudio-marisol', name: 'Estudio Marisol', branches: [{ id: 'estudio-marisol', name: 'Estudio Marisol' }] },
  { id: 'navaja-fina', name: 'Navaja Fina', branches: [{ id: 'navaja-fina', name: 'Navaja Fina' }] },
  { id: 'el-faro', name: 'Barbería El Faro', branches: [{ id: 'el-faro', name: 'Barbería El Faro' }] },
]

// Appointment history per Empleado (RF-W17): each confirmation,
// cancellation and reschedule, with the date and who did it. Generated the
// same every time; the newest first.
function rng(seed) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}
const SERVICES = ['Corte clásico', 'Fade', 'Arreglo de barba', 'Corte + barba']
export function historyFor(employeeId) {
  const r = rng(`historial-${employeeId}`)
  const events = []
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
