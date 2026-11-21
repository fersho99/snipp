// The one set of sample data for the client app and the web panel. Today is
// Thursday 12 November 2026, 10:00 am (see dates.ts). Every list is built the
// same way each time, so a reset always starts from the same story.
import { DEMO_TODAY, appointmentStart, hhmm, iso, minutesOf } from './dates'
import type { Appointment, AppointmentStatus, Block, Branch, Business, Client, DemoData, Employee, Product, Service, WeekHours } from './types'

export const businesses: Business[] = [
  { id: 'los-compas', name: 'Barbería Los Compas', kind: 'Barbería' },
  { id: 'estudio-marisol', name: 'Estudio Marisol', kind: 'Salón y uñas' },
  { id: 'navaja-fina', name: 'Navaja Fina', kind: 'Barbería clásica' },
]

export const services: Service[] = [
  { id: 'corte-clasico', name: 'Corte clásico', description: 'Corte con tijera y máquina, lavado y peinado.', minutes: 40, price: 180 },
  { id: 'fade', name: 'Fade', description: 'Degradado a máquina desde cero, con navaja en el contorno.', minutes: 45, price: 220 },
  { id: 'barba', name: 'Arreglo de barba', description: 'Perfilado con navaja y toalla caliente.', minutes: 25, price: 120 },
  { id: 'corte-barba', name: 'Corte + barba', description: 'Corte clásico o fade más arreglo de barba.', minutes: 60, price: 280 },
  { id: 'tinte', name: 'Tinte completo', description: 'Color de raíz a puntas con prueba de tono.', minutes: 120, price: 850 },
  { id: 'mechas', name: 'Mechas', description: 'Mechas con papel y matizado.', minutes: 150, price: 1200 },
  { id: 'unas', name: 'Uñas acrílicas', description: 'Aplicación de uñas acrílicas con diseño sencillo.', minutes: 90, price: 450 },
]

// Monday to Friday open-close, Saturday satOpen-satClose, Sunday closed.
const week = (open: string, close: string, satOpen = '10:00', satClose = '18:00'): WeekHours => [null, [open, close], [open, close], [open, close], [open, close], [open, close], [satOpen, satClose]]
const BARBER = ['corte-clasico', 'fade', 'barba', 'corte-barba']

export const branches: Branch[] = [
  {
    id: 'los-compas-centro',
    businessId: 'los-compas',
    name: 'Los Compas Centro',
    address: 'Av. Obregón y Calle 5',
    neighborhood: 'Col. Centro',
    phone: '653 534 2210',
    description: 'Barbería de barrio desde 2014. Fades, cortes clásicos y arreglo de barba con toalla caliente. Hay café mientras esperas y estacionamiento en la Calle 5.',
    hours: week('10:00', '20:00'),
    serviceIds: BARBER,
  },
  {
    id: 'los-compas-norte',
    businessId: 'los-compas',
    name: 'Los Compas Norte',
    address: 'Av. Libertad y Calle 32',
    neighborhood: 'Col. Burócrata',
    phone: '653 536 1184',
    description: 'La segunda sucursal de Los Compas, con los mismos precios. Más tranquila entre semana antes de las 4:00 pm.',
    hours: week('10:00', '20:00'),
    serviceIds: BARBER,
  },
  {
    id: 'estudio-marisol',
    businessId: 'estudio-marisol',
    name: 'Estudio Marisol',
    address: 'Calle 2 y Av. Madero',
    neighborhood: 'Col. Centro',
    phone: '653 534 0957',
    description: 'Salón de color y uñas. Tintes, mechas y uñas acrílicas con cita. Para mechas, llega con el cabello sin lavar.',
    hours: week('09:00', '19:00', '09:00', '15:00'),
    serviceIds: ['tinte', 'mechas', 'unas'],
  },
  {
    id: 'navaja-fina',
    businessId: 'navaja-fina',
    name: 'Navaja Fina',
    address: 'Blvd. Juárez',
    neighborhood: 'Col. Comercial',
    phone: '653 535 7702',
    description: 'Barbería clásica con afeitado a navaja y toalla caliente. Abrió en SNIPP este mes.',
    hours: [null, null, ['11:00', '21:00'], ['11:00', '21:00'], ['11:00', '21:00'], ['11:00', '21:00'], ['11:00', '21:00']],
    serviceIds: ['corte-clasico', 'barba', 'corte-barba'],
  },
]

// Each Empleado belongs to one branch (RF-W10). Itzel works the front desk,
// so clients do not book with her.
export const employees: Employee[] = [
  { id: 'luis', name: 'Luis Ortega', specialty: 'Fades y barba', email: 'luis.ortega@gmail.com', businessId: 'los-compas', branchId: 'los-compas-centro', bookable: true, schedule: week('10:00', '19:00'), serviceIds: BARBER },
  { id: 'ramon', name: 'Ramón Cázares', specialty: 'Corte clásico, navaja', email: 'ramon.cazares@gmail.com', businessId: 'los-compas', branchId: 'los-compas-centro', bookable: true, schedule: week('12:00', '20:00'), serviceIds: ['corte-clasico', 'barba', 'corte-barba'] },
  { id: 'itzel', name: 'Itzel Duarte', specialty: 'Recepción', email: 'itzel.duarte@gmail.com', businessId: 'los-compas', branchId: 'los-compas-centro', bookable: false, schedule: week('10:00', '20:00'), serviceIds: [] },
  { id: 'oscar', name: 'Óscar Félix', specialty: 'Fades y diseños', email: 'oscar.felix@gmail.com', businessId: 'los-compas', branchId: 'los-compas-norte', bookable: true, schedule: week('10:00', '20:00'), serviceIds: BARBER },
  { id: 'karla', name: 'Karla Ruiz', specialty: 'Color y mechas', email: 'karla.ruiz@gmail.com', businessId: 'estudio-marisol', branchId: 'estudio-marisol', bookable: true, schedule: week('09:00', '19:00', '09:00', '15:00'), serviceIds: ['tinte', 'mechas'] },
  { id: 'fernanda', name: 'Fernanda Lugo', specialty: 'Uñas acrílicas', email: 'fernanda.lugo@gmail.com', businessId: 'estudio-marisol', branchId: 'estudio-marisol', bookable: true, schedule: week('09:00', '19:00', '09:00', '15:00'), serviceIds: ['unas'] },
]

export const clients: Client[] = [
  { firstName: 'Andrea', name: 'Andrea Valenzuela', email: 'andrea.valenzuela@gmail.com', phone: '653 118 4420' },
]
const ANDREA = clients[0]

export const products: Product[] = [
  { id: 'pomada', name: 'Pomada mate', size: '100 g', price: 230, description: 'Fijación media sin brillo que se quita con agua. Es la que usa Luis para terminar los fades.', howTo: 'Toma una cantidad del tamaño de un chícharo, frótala entre las manos y aplícala con el cabello seco.' },
  { id: 'aceite', name: 'Aceite para barba', size: '30 ml', price: 190, description: 'Suaviza la barba y quita la comezón de las primeras semanas. Aroma a cedro.', howTo: 'De 3 a 4 gotas después de bañarte, de la raíz a las puntas.' },
  { id: 'shampoo', name: 'Shampoo matizador', size: '300 ml', price: 310, description: 'Neutraliza el tono amarillo en canas y cabello decolorado.', howTo: 'Úsalo una o dos veces por semana; déjalo 3 minutos antes de enjuagar.' },
  { id: 'cera', name: 'Cera fijación media', size: '', price: 210, description: 'Para peinados con textura que puedes rehacer durante el día.', howTo: 'Calienta un poco entre los dedos y peina en seco o con el cabello húmedo.' },
]

// Pieces per branch. Estudio Marisol sells the shampoo, so a fourth cart can
// be tried in the app (RN-06).
export const stock: Record<string, Record<string, number>> = {
  'los-compas-centro': { pomada: 14, aceite: 6, shampoo: 0, cera: 22 },
  'los-compas-norte': { pomada: 3, cera: 5 },
  'navaja-fina': { aceite: 4, pomada: 8 },
  'estudio-marisol': { shampoo: 5 },
}

// Days off and breaks already blocked in the agenda (RF-W15).
const blocks: Block[] = [
  { id: 'B-1', employeeId: 'luis', branchId: 'los-compas-centro', from: '2026-11-13T14:00', to: '2026-11-13T15:00', reason: 'Descanso' },
  { id: 'B-2', employeeId: 'oscar', branchId: 'los-compas-norte', from: '2026-11-18T00:00', to: '2026-11-20T23:59', reason: 'Vacaciones' },
  { id: 'B-3', employeeId: 'luis', branchId: 'los-compas-centro', from: '2026-11-26T00:00', to: '2026-11-27T23:59', reason: 'Vacaciones' },
  { id: 'B-4', employeeId: 'ramon', branchId: 'los-compas-centro', from: '2026-12-23T00:00', to: '2026-12-23T23:59', reason: 'Día libre' },
]

// ---------------------------------------------------------- appointments

type Fixed = Omit<Appointment, 'clientName' | 'clientEmail' | 'status'> & Partial<Pick<Appointment, 'clientName' | 'clientEmail' | 'status'>>
const t = (time: string) => minutesOf(time)
const andrea = { clientName: ANDREA.name, clientEmail: ANDREA.email }

// Andrea's appointments, the ones she sees in the app (RF-M06 to RF-M08,
// RF-M12 to RF-M14).
const andreaAppointments: Appointment[] = [
  { folio: 'C-10482', serviceId: 'fade', employeeId: 'luis', branchId: 'los-compas-centro', date: '2026-11-19', start: t('17:30'), status: 'confirmada', ...andrea },
  {
    folio: 'C-10486', serviceId: 'corte-clasico', employeeId: 'oscar', branchId: 'los-compas-norte', date: '2026-11-21', start: t('12:00'), status: 'cancelada', cancelledBy: 'Jefe', ...andrea,
    note: 'Óscar no va a estar en la sucursal ese día. Disculpa el cambio.', changedAt: 'ayer a las 7:40 pm',
  },
  {
    // The business moved it to Ramón and Andrea has not answered (RF-M08, RN-04).
    folio: 'C-10490', serviceId: 'corte-clasico', employeeId: 'ramon', branchId: 'los-compas-centro', date: '2026-11-24', start: t('18:00'), status: 'cambio', ...andrea,
    previous: { employeeId: 'luis', date: '2026-11-24', start: t('18:00') },
    note: 'Luis no va a estar esa tarde. Ramón te atiende con el mismo corte.', changedAt: 'hoy a las 9:12 am',
  },
  { folio: 'C-10497', serviceId: 'unas', employeeId: 'fernanda', branchId: 'estudio-marisol', date: '2026-11-28', start: t('11:00'), status: 'confirmada', ...andrea },

  { folio: 'C-10431', serviceId: 'fade', employeeId: 'luis', branchId: 'los-compas-centro', date: '2026-10-31', start: t('17:00'), status: 'atendida', review: null, report: null, ...andrea },
  { folio: 'C-10402', serviceId: 'corte-clasico', employeeId: 'ramon', branchId: 'los-compas-centro', date: '2026-10-17', start: t('12:00'), status: 'atendida', review: { stars: 5, text: 'Ramón trabaja con mucha calma.' }, report: null, ...andrea },
  { folio: 'C-10388', serviceId: 'unas', employeeId: 'fernanda', branchId: 'estudio-marisol', date: '2026-10-10', start: t('11:00'), status: 'no-asistio', ...andrea },
  {
    folio: 'C-10370', serviceId: 'fade', employeeId: 'luis', branchId: 'los-compas-centro', date: '2026-10-03', start: t('18:00'), status: 'empleado-no-se-presento', ...andrea,
    report: { sentOn: '3 de octubre', state: 'en revisión', reason: 'puntualidad', text: 'Llegué a las 6:00 pm y Luis no estaba. Esperé 25 minutos y nadie me avisó que no iba a venir.' },
  },
  { folio: 'C-10355', serviceId: 'tinte', employeeId: 'karla', branchId: 'estudio-marisol', date: '2026-09-26', start: t('10:00'), status: 'cancelada', cancelledBy: 'cliente', ...andrea },
  {
    folio: 'C-10318', serviceId: 'corte-barba', employeeId: 'ramon', branchId: 'los-compas-centro', date: '2026-09-12', start: t('16:00'), status: 'atendida', ...andrea,
    review: { stars: 3, text: 'La barba quedó bien definida, pero la capa tenía cabello del cliente anterior.' },
    report: { sentOn: '12 de septiembre', state: 'atendido', reason: 'higiene', text: 'La capa que me pusieron tenía cabello del cliente anterior y Ramón no la cambió cuando se lo dije.' },
  },
]

// Appointments of other clients the panel examples rely on (agenda W6 and
// the reassignment of an Empleado who migrates or is unlinked, W5).
const fixedAppointments: Fixed[] = [
  { folio: 'C-10521', employeeId: 'ramon', branchId: 'los-compas-centro', serviceId: 'corte-clasico', date: '2026-11-12', start: t('12:00') },
  { folio: 'C-10533', employeeId: 'ramon', branchId: 'los-compas-centro', serviceId: 'corte-barba', date: '2026-11-13', start: t('16:00') },
  { folio: 'C-10538', employeeId: 'ramon', branchId: 'los-compas-centro', serviceId: 'fade', date: '2026-11-14', start: t('11:00') },
  { folio: 'C-10540', employeeId: 'ramon', branchId: 'los-compas-centro', serviceId: 'corte-clasico', date: '2026-11-14', start: t('13:00') },
  { folio: 'C-10547', employeeId: 'ramon', branchId: 'los-compas-centro', serviceId: 'barba', date: '2026-11-17', start: t('18:30') },
  { folio: 'C-10552', employeeId: 'ramon', branchId: 'los-compas-centro', serviceId: 'corte-barba', date: '2026-11-19', start: t('13:00') },
  { folio: 'C-10519', employeeId: 'luis', branchId: 'los-compas-centro', serviceId: 'fade', date: '2026-11-12', start: t('12:00') },
  { folio: 'C-10520', employeeId: 'luis', branchId: 'los-compas-centro', serviceId: 'fade', date: '2026-11-12', start: t('17:00') },
  { folio: 'C-10539', employeeId: 'luis', branchId: 'los-compas-centro', serviceId: 'corte-barba', date: '2026-11-14', start: t('13:00') },
  { folio: 'C-10544', employeeId: 'luis', branchId: 'los-compas-centro', serviceId: 'barba', date: '2026-11-16', start: t('11:00') },
  { folio: 'C-10549', employeeId: 'luis', branchId: 'los-compas-centro', serviceId: 'fade', date: '2026-11-18', start: t('15:00') },
  { folio: 'C-10530', employeeId: 'oscar', branchId: 'los-compas-norte', serviceId: 'fade', date: '2026-11-13', start: t('12:00') },
  { folio: 'C-10536', employeeId: 'oscar', branchId: 'los-compas-norte', serviceId: 'corte-clasico', date: '2026-11-14', start: t('10:00') },
  { folio: 'C-10545', employeeId: 'oscar', branchId: 'los-compas-norte', serviceId: 'corte-barba', date: '2026-11-16', start: t('17:30') },
]

const CLIENTS = ['Jorge Méndez', 'Carlos Ríos', 'Daniela Paz', 'Iván Soto', 'Luz Gámez', 'Héctor Villa', 'Mario Leyva', 'Sergio Acosta', 'Raúl Quintero', 'Pedro Lugo', 'Emilio Castro', 'Fernando Ochoa', 'Abel Rubio', 'Tomás Zazueta', 'Óliver Corral', 'Joel Arce', 'Ricardo Peña', 'Alan Duarte', 'Paola Robles', 'Mariana León']

// Days the demo shows as fully booked for an Empleado (calendar "Lleno").
const FULL_DAYS: Record<string, string[]> = { luis: ['2026-11-14', '2026-11-21'] }
// Kept free so Andrea can reschedule C-10482 to a nearby time.
const KEEP_FREE: Record<string, [number, number]> = { 'luis|2026-11-19': [t('15:00'), t('18:30')] }
const FIRST_DAY = new Date(2026, 10, 9)
const LAST_DAY = new Date(2026, 10, 28)

// Small deterministic PRNG: the same seed gives the same agenda every time.
export function rng(seed: string) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

const minutesOfService = (id: string) => services.find((s) => s.id === id)?.minutes ?? 45
const overlaps = (a: { date: string; start: number; serviceId: string }, b: { date: string; start: number; serviceId: string }) =>
  a.date === b.date && a.start < b.start + minutesOfService(b.serviceId) && b.start < a.start + minutesOfService(a.serviceId)
// Blocks keep "YYYY-MM-DDTHH:MM", so comparing the text compares the time.
const blocked = (employeeId: string, date: string, start: number, minutes: number) =>
  blocks.some((b) => b.employeeId === employeeId && `${date}T${hhmm(start)}` < b.to && `${date}T${hhmm(start + minutes)}` > b.from)

// Fills each bookable Empleado's days with appointments that do not overlap
// the fixed ones, the blocks or each other. Past ones (before today 10:00)
// already have their final status.
function buildAppointments(): Appointment[] {
  const r = rng('agenda-compartida')
  const list: Appointment[] = [
    ...andreaAppointments,
    ...fixedAppointments.map((a, i): Appointment => ({ ...a, clientName: a.clientName ?? CLIENTS[(i * 7) % CLIENTS.length], clientEmail: a.clientEmail ?? null, status: a.status ?? 'confirmada' })),
  ]
  let folio = 10560
  for (const e of employees.filter((x) => x.bookable)) {
    for (let d = FIRST_DAY; d <= LAST_DAY; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const hours = e.schedule[d.getDay()]
      if (!hours) continue
      const date = iso(d)
      const open = minutesOf(hours[0])
      const close = minutesOf(hours[1])
      const full = FULL_DAYS[e.id]?.includes(date)
      const free = KEEP_FREE[`${e.id}|${date}`]
      let start = open
      while (start + 25 <= close) {
        const serviceId = e.serviceIds[Math.floor(r() * e.serviceIds.length)]
        const minutes = minutesOfService(serviceId)
        const take = full || r() <= 0.42
        const cand = { date, start, serviceId }
        const fits = start + minutes <= close
        const nearFixed = fixedAppointments.some((f) => f.branchId === e.branchId && f.date === date && Math.abs(f.start - start) < 60)
        const busy = list.some((a) => a.employeeId === e.id && a.status !== 'cancelada' && overlaps(a, cand))
        const kept = free && start < free[1] && start + minutes > free[0]
        if (take && fits && !busy && !kept && !blocked(e.id, date, start, minutes) && (full || !nearFixed)) {
          let status: AppointmentStatus = 'confirmada'
          if (appointmentStart(cand) < DEMO_TODAY) {
            const x = r()
            status = x < 0.84 ? 'atendida' : x < 0.92 ? 'cancelada' : x < 0.98 ? 'no-asistio' : 'empleado-no-se-presento'
          }
          folio += 1 + Math.floor(r() * 2)
          list.push({
            folio: `C-${folio}`, employeeId: e.id, branchId: e.branchId, serviceId, date, start,
            clientName: CLIENTS[Math.floor(r() * CLIENTS.length)], clientEmail: null, status,
            ...(status === 'cancelada' ? { cancelledBy: 'cliente' as const } : {}),
          })
          // A full day is booked back to back; otherwise leave the usual gaps.
          start += full ? minutes : 30 * Math.ceil(minutes / 30)
        } else start += full ? 15 : 30
      }
    }
  }
  return list.sort((a, b) => (a.date + String(a.start).padStart(4, '0')).localeCompare(b.date + String(b.start).padStart(4, '0')))
}

// A fresh copy of the whole sample database.
export function seedData(): DemoData {
  return JSON.parse(JSON.stringify({ businesses, branches, services, employees, clients, products, stock, blocks, appointments: buildAppointments() })) as DemoData
}
