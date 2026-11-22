// The one set of sample data for the client app and the web panel. Today is
// Thursday 12 November 2026, 10:00 am (see dates.ts). Every list is built the
// same way each time, so a reset always starts from the same story.
import { DEMO_TODAY, appointmentStart, hhmm, iso, minutesOf } from './dates'
import { sha256 } from './sha256'
import { buildSalesHistory } from './history'
import type { Account, Appointment, AppointmentStatus, Block, Branch, Business, ClientNotification, ClientReport, DemoData, Employee, JoinRequest, Order, Plan, PointsMovement, Product, Review, Service, StockMove, SubscriptionPayment, WeekHours } from './types'

export const hashPassword = (salt: string, password: string) => sha256(`${salt}:${password}`)

// Subscriptions (RF-W25, RN-13): El Faro's ended on 5 November without
// payment and Uñas Coral was suspended by the Administrator (RF-W28).
export const businesses: Business[] = [
  { id: 'los-compas', name: 'Barbería Los Compas', kind: 'Barbería', subscription: { kind: 'pagada', planId: 'mensual', endsOn: '2026-12-03' }, suspended: false, minNoticeHours: 2, joinedOn: '2026-08-03' },
  { id: 'estudio-marisol', name: 'Estudio Marisol', kind: 'Salón y uñas', subscription: { kind: 'pagada', planId: 'anual', endsOn: '2027-03-12' }, suspended: false, minNoticeHours: 2, joinedOn: '2026-08-12' },
  { id: 'navaja-fina', name: 'Navaja Fina', kind: 'Barbería clásica', subscription: { kind: 'prueba', planId: 'mensual', endsOn: '2026-11-25' }, suspended: false, minNoticeHours: 2, joinedOn: '2026-10-25' },
  { id: 'el-faro', name: 'Barbería El Faro', kind: 'Barbería', subscription: { kind: 'pagada', planId: 'mensual', endsOn: '2026-11-05' }, suspended: false, minNoticeHours: 2, joinedOn: '2026-09-05' },
  { id: 'unas-coral', name: 'Uñas Coral', kind: 'Uñas', subscription: { kind: 'pagada', planId: 'semestral', endsOn: '2027-03-20' }, suspended: true, minNoticeHours: 2, joinedOn: '2026-09-20' },
]

// RF-W27: plans the Administrador manages. Prices are examples.
export const plans: Plan[] = [
  { id: 'mensual', name: 'Mensual', price: 499, months: 1, offered: true },
  { id: 'semestral', name: 'Semestral', price: 2694, months: 6, offered: true },
  { id: 'anual', name: 'Anual', price: 4990, months: 12, offered: true },
]

// RF-W25, RN-17: subscription payments, newest first.
const payments: SubscriptionPayment[] = [
  { id: 'pay-3', businessId: 'los-compas', on: '2026-11-03', planId: 'mensual', amount: 499, ref: 'pi_3QGv1x2eZvKYlo2C1mKp8sRt' },
  { id: 'pay-2', businessId: 'los-compas', on: '2026-10-03', planId: 'mensual', amount: 499, ref: 'pi_3Q5aLc2eZvKYlo2C0yUj4nVb' },
  { id: 'pay-1', businessId: 'los-compas', on: '2026-09-03', planId: 'mensual', amount: 499, ref: 'pi_3PuQe82eZvKYlo2C1dWq2hZx' },
  { id: 'pay-m1', businessId: 'estudio-marisol', on: '2026-09-12', planId: 'anual', amount: 4990, ref: 'pi_3PyZt12eZvKYlo2C0rJk7mQa' },
  { id: 'pay-f1', businessId: 'el-faro', on: '2026-10-05', planId: 'mensual', amount: 499, ref: 'pi_3Q6bWn2eZvKYlo2C1pLs9tUv' },
  { id: 'pay-c1', businessId: 'unas-coral', on: '2026-10-20', planId: 'semestral', amount: 2694, ref: 'pi_3QBdKp2eZvKYlo2C0aTq5wYz' },
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

type BranchData = Omit<Branch, 'active' | 'inactiveServiceIds'>
const branchList: BranchData[] = [
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
  {
    id: 'el-faro',
    businessId: 'el-faro',
    name: 'Barbería El Faro',
    address: 'Calle 8 y Av. Hidalgo',
    neighborhood: 'Col. Pueblo Nuevo',
    phone: '653 534 8826',
    description: 'Barbería de cortes clásicos y fades.',
    hours: week('10:00', '20:00'),
    serviceIds: ['corte-clasico', 'fade', 'barba'],
  },
  {
    id: 'unas-coral',
    businessId: 'unas-coral',
    name: 'Uñas Coral',
    address: 'Av. Kino y Calle 15',
    neighborhood: 'Col. Comercial',
    phone: '653 536 4410',
    description: 'Uñas acrílicas y de gel con cita.',
    hours: week('10:00', '19:00', '10:00', '15:00'),
    serviceIds: ['unas'],
  },
]

export const branches: Branch[] = branchList.map((b) => ({ ...b, active: true, inactiveServiceIds: [] }))

// Each Empleado belongs to one branch (RF-W10). Itzel works the front desk,
// so clients do not book with her.
type EmployeeData = Omit<Employee, 'status' | 'migration' | 'displayName' | 'specialties'>
const SPECIALTIES: Record<string, string[]> = { luis: ['Fades', 'Barba'], ramon: ['Corte clásico', 'Navaja'], itzel: ['Recepción'], oscar: ['Fades', 'Diseños'] }
const employeeList: EmployeeData[] = [
  { id: 'luis', name: 'Luis Ortega', specialty: 'Fades y barba', email: 'luis.ortega@gmail.com', businessId: 'los-compas', branchId: 'los-compas-centro', bookable: true, schedule: week('10:00', '19:00'), serviceIds: BARBER },
  { id: 'ramon', name: 'Ramón Cázares', specialty: 'Corte clásico, navaja', email: 'ramon.cazares@gmail.com', businessId: 'los-compas', branchId: 'los-compas-centro', bookable: true, schedule: week('12:00', '20:00'), serviceIds: ['corte-clasico', 'barba', 'corte-barba'] },
  { id: 'itzel', name: 'Itzel Duarte', specialty: 'Recepción', email: 'itzel.duarte@gmail.com', businessId: 'los-compas', branchId: 'los-compas-centro', bookable: false, schedule: week('10:00', '20:00'), serviceIds: [] },
  { id: 'oscar', name: 'Óscar Félix', specialty: 'Fades y diseños', email: 'oscar.felix@gmail.com', businessId: 'los-compas', branchId: 'los-compas-norte', bookable: true, schedule: week('10:00', '20:00'), serviceIds: BARBER },
  { id: 'karla', name: 'Karla Ruiz', specialty: 'Color y mechas', email: 'karla.ruiz@gmail.com', businessId: 'estudio-marisol', branchId: 'estudio-marisol', bookable: true, schedule: week('09:00', '19:00', '09:00', '15:00'), serviceIds: ['tinte', 'mechas'] },
  { id: 'fernanda', name: 'Fernanda Lugo', specialty: 'Uñas acrílicas', email: 'fernanda.lugo@gmail.com', businessId: 'estudio-marisol', branchId: 'estudio-marisol', bookable: true, schedule: week('09:00', '19:00', '09:00', '15:00'), serviceIds: ['unas'] },
]
export const employees: Employee[] = employeeList.map((e) => ({ ...e, status: 'activo', migration: null, displayName: e.name, specialties: SPECIALTIES[e.id] ?? [e.specialty] }))

// Demo accounts (RF-M01, RF-W01 to RF-W04). One password per platform,
// written in frontend/README.md; only its salted hash is kept (RNF-G01).
export const APP_PASSWORD = 'compas2025'
export const PANEL_PASSWORD = 'snipp2026'
type AccountData = Omit<Account, 'salt' | 'passwordHash'>
const accountList: (AccountData & { password: string })[] = [
  { email: 'admin@snipp.mx', role: 'admin', name: 'Daniela Ibarra', phone: '', businessId: null, branchId: null, password: PANEL_PASSWORD },
  { email: 'martin.salazar@loscompas.mx', role: 'jefe', name: 'Martín Salazar', phone: '653 534 2210', businessId: 'los-compas', branchId: null, password: PANEL_PASSWORD },
  { email: 'jefe.vencido@elfaro.mx', role: 'jefe', name: 'Rogelio Tapia', phone: '653 534 8826', businessId: 'el-faro', branchId: null, password: PANEL_PASSWORD },
  { email: 'jefe.suspendido@unascoral.mx', role: 'jefe', name: 'Karen Lugo', phone: '653 536 4410', businessId: 'unas-coral', branchId: null, password: PANEL_PASSWORD },
  { email: 'luis.ortega@gmail.com', role: 'empleado', name: 'Luis Ortega', phone: '', businessId: 'los-compas', branchId: 'los-compas-centro', password: PANEL_PASSWORD },
  { email: 'oscar.felix@gmail.com', role: 'empleado', name: 'Óscar Félix', phone: '', businessId: 'los-compas', branchId: 'los-compas-norte', password: PANEL_PASSWORD },
  { email: 'sofia.ramos@gmail.com', role: 'empleado', name: 'Sofía Ramos', phone: '', businessId: null, branchId: null, password: PANEL_PASSWORD },
  { email: 'andrea.valenzuela@gmail.com', role: 'cliente', name: 'Andrea Valenzuela', phone: '653 118 4420', businessId: null, branchId: null, password: APP_PASSWORD },
  { email: 'cliente.nuevo@gmail.com', role: 'cliente', name: 'Daniel Ochoa', phone: '653 120 7781', businessId: null, branchId: null, password: APP_PASSWORD },
]
// The sample accounts get a fixed salt so the seed is the same every time;
// new accounts get a random one (see auth.ts).
export const accounts: Account[] = accountList.map(({ password, ...a }) => {
  const salt = sha256(`salt:${a.email}`).slice(0, 16)
  return { ...a, salt, passwordHash: hashPassword(salt, password) }
})
const ANDREA = { name: 'Andrea Valenzuela', email: 'andrea.valenzuela@gmail.com' }
const ANDREA_ORDER = { clientName: ANDREA.name, clientEmail: ANDREA.email }

export const products: Product[] = [
  { id: 'pomada', name: 'Pomada mate', size: '100 g', price: 230, description: 'Fijación media sin brillo que se quita con agua. Es la que usa Luis para terminar los fades.', howTo: 'Toma una cantidad del tamaño de un chícharo, frótala entre las manos y aplícala con el cabello seco.', photo: '/photos/producto-frasco.jpg' },
  { id: 'aceite', name: 'Aceite para barba', size: '30 ml', price: 190, description: 'Suaviza la barba y quita la comezón de las primeras semanas. Aroma a cedro.', howTo: 'De 3 a 4 gotas después de bañarte, de la raíz a las puntas.', photo: null },
  { id: 'shampoo', name: 'Shampoo matizador', size: '300 ml', price: 310, description: 'Neutraliza el tono amarillo en canas y cabello decolorado.', howTo: 'Úsalo una o dos veces por semana; déjalo 3 minutos antes de enjuagar.', photo: null },
  { id: 'cera', name: 'Cera fijación media', size: '', price: 210, description: 'Para peinados con textura que puedes rehacer durante el día.', howTo: 'Calienta un poco entre los dedos y peina en seco o con el cabello húmedo.', photo: null },
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

// ------------------------------------------------- Empleados and requests

// RF-W10, RF-W12: requests waiting for the Jefe of Los Compas. Sofía has no
// business yet and asked to join Centro; Diego wants to migrate from El Faro.
const requests: JoinRequest[] = [
  { id: 'S-31', businessId: 'los-compas', kind: 'ingreso', name: 'Sofía Ramos', email: 'sofia.ramos@gmail.com', branchId: 'los-compas-centro', sentOn: '2026-11-10', status: 'enviada' },
  { id: 'S-32', businessId: 'los-compas', kind: 'migracion', name: 'Diego Armenta', email: 'diego.armenta@gmail.com', from: 'Barbería El Faro', branchId: 'los-compas-norte', sentOn: '2026-11-06', status: 'enviada' },
]

// ------------------------------------------------------------------- store

const line = (sku: string, qty: number) => {
  const p = products.find((x) => x.id === sku) as Product
  return { productId: sku, name: p.size ? `${p.name} ${p.size}` : p.name, qty, price: p.price }
}
// RF-W21, RF-M11: orders of the last days. Andrea's are the ones she sees in the app.
const orders: Order[] = [
  { folio: 'P-2281', businessId: 'los-compas', branchId: 'los-compas-centro', clientName: 'Jorge Méndez', clientEmail: null, items: [line('pomada', 2)], pointsUsed: 0, discount: 0, paymentRef: 'pi_3QJ1aB2eZvKYlo2C0Xk9pLmN', status: 'pagado', timeline: [['pagado', '2026-11-12T09:41']] },
  { folio: 'P-2280', businessId: 'los-compas', branchId: 'los-compas-norte', clientName: 'Luz Gámez', clientEmail: null, items: [line('cera', 1)], pointsUsed: 0, discount: 0, paymentRef: 'pi_3QIzQe2eZvKYlo2C1rT5uVwX', status: 'pagado', timeline: [['pagado', '2026-11-11T19:03']] },
  { folio: 'P-2279', businessId: 'los-compas', branchId: 'los-compas-centro', ...ANDREA_ORDER, items: [line('aceite', 1)], pointsUsed: 0, discount: 0, paymentRef: 'pi_3QIx4m2eZvKYlo2C0qW8dRtz', status: 'listo', timeline: [['pagado', '2026-11-10T18:12'], ['listo', '2026-11-11T11:30']] },
  { folio: 'P-2272', businessId: 'los-compas', branchId: 'los-compas-centro', clientName: 'Carlos Ríos', clientEmail: null, items: [line('cera', 1), line('aceite', 1)], pointsUsed: 0, discount: 0, paymentRef: 'pi_3QHq8w2eZvKYlo2C0bH3yZaC', status: 'entregado', timeline: [['pagado', '2026-11-06T13:20'], ['listo', '2026-11-06T15:00'], ['entregado', '2026-11-07T12:10']] },
  { folio: 'P-2264', businessId: 'los-compas', branchId: 'los-compas-centro', ...ANDREA_ORDER, items: [line('cera', 1)], pointsUsed: 73, discount: 73, paymentRef: 'pi_3QH8sK2eZvKYlo2C1aX4TbQe', status: 'entregado', timeline: [['pagado', '2026-11-02T12:14'], ['listo', '2026-11-02T13:02'], ['entregado', '2026-11-03T18:40']] },
  { folio: 'P-2250', businessId: 'los-compas', branchId: 'los-compas-norte', ...ANDREA_ORDER, items: [line('pomada', 1)], pointsUsed: 0, discount: 0, paymentRef: 'pi_3QDzRt2eZvKYlo2C0mN7wLsP', status: 'cancelado', refund: { amount: 230, ref: 're_3QDzRt2eZvKYlo2C0aB1cD2e', reason: 'La sucursal se quedó sin pomada.' }, timeline: [['pagado', '2026-10-24T10:30'], ['cancelado', '2026-10-24T11:05']] },
]

// RF-W20: sales lower the stock once the payment is confirmed (RN-07).
const stockMoves: StockMove[] = [
  { id: 'mv1', branchId: 'los-compas-centro', productId: 'pomada', on: '2026-11-12T09:41', change: -2, reason: 'Venta, pedido P-2281' },
  { id: 'mv2', branchId: 'los-compas-norte', productId: 'cera', on: '2026-11-11T19:03', change: -1, reason: 'Venta, pedido P-2280' },
  { id: 'mv3', branchId: 'los-compas-centro', productId: 'aceite', on: '2026-11-10T18:12', change: -1, reason: 'Venta, pedido P-2279' },
  { id: 'mv4', branchId: 'los-compas-centro', productId: 'pomada', on: '2026-11-09T11:00', change: 12, reason: 'Llegó mercancía' },
  { id: 'mv5', branchId: 'los-compas-centro', productId: 'cera', on: '2026-11-06T13:20', change: -1, reason: 'Venta, pedido P-2272' },
  { id: 'mv6', branchId: 'los-compas-centro', productId: 'aceite', on: '2026-11-06T13:20', change: -1, reason: 'Venta, pedido P-2272' },
  { id: 'mv7', branchId: 'los-compas-centro', productId: 'shampoo', on: '2026-11-05T17:45', change: -1, reason: 'Venta, pedido P-2270' },
  { id: 'mv8', branchId: 'los-compas-centro', productId: 'cera', on: '2026-11-02T12:14', change: -1, reason: 'Venta, pedido P-2264' },
]

// RF-M15, RN-09: Andrea's points, all in Los Compas.
const pointsOf = (id: string, points: number, label: string, on: string, route: string): PointsMovement => ({ id, clientEmail: ANDREA.email, businessId: 'los-compas', points, label, on, route })
const points: PointsMovement[] = [
  pointsOf('m6', 19, 'Compra, pedido P-2279', '2026-11-10', '/pedido/P-2279'),
  pointsOf('m5', 13, 'Compra, pedido P-2264', '2026-11-02', '/pedido/P-2264'),
  pointsOf('m4', -73, 'Canjeaste en el pedido P-2264', '2026-11-02', '/pedido/P-2264'),
  pointsOf('m3', 22, 'Fade, cita C-10431 atendida', '2026-10-31', '/cita/C-10431'),
  pointsOf('m2', 18, 'Corte clásico, cita C-10402 atendida', '2026-10-17', '/cita/C-10402'),
  pointsOf('m1', 28, 'Corte + barba, cita C-10318 atendida', '2026-09-12', '/cita/C-10318'),
]

// ---------------------------------------------------------- notifications

const note = (id: string, kind: ClientNotification['kind'], at: string, read: boolean, route: string, title: string, body: string): ClientNotification => ({ id, clientEmail: ANDREA.email, kind, at, read, route, title, body })
// RF-M16: what Andrea already received, newest first.
const notifications: ClientNotification[] = [
  note('n8', 'cambio', '2026-11-12T09:12', false, '/cambio/C-10490', 'Barbería Los Compas cambió tu cita del martes 24', 'Ramón Cázares te atiende a las 6:00 pm en lugar de Luis Ortega. Acepta el cambio, reagenda o cancela.'),
  note('n7', 'cancelacion', '2026-11-11T19:40', false, '/cita/C-10486', 'Los Compas Norte canceló tu cita del sábado 21', 'Tu corte clásico de las 12:00 pm con Óscar Félix. Puedes reservar otro horario.'),
  note('n6', 'pedido-listo', '2026-11-11T11:30', true, '/pedido/P-2279', 'Tu pedido P-2279 está listo para recoger', 'Recógelo en Barbería Los Compas, Av. Obregón y Calle 5. Muestra el folio al llegar.'),
  note('n9', 'carrito-vaciado', '2026-11-10T21:40', true, '/tienda/navaja-fina', 'Se vació tu carrito de Navaja Fina', 'Pasaron 7 días sin cambios. Los productos siguen en la tienda si aún los quieres.'),
  note('n5', 'confirmacion', '2026-11-09T20:05', true, '/cita/C-10497', 'Cita confirmada: uñas acrílicas el sábado 28', 'Con Fernanda Lugo en Estudio Marisol a las 11:00 am. Folio C-10497.'),
  note('n4', 'confirmacion', '2026-11-07T13:15', true, '/cita/C-10482', 'Cita confirmada: fade el jueves 19', 'Con Luis Ortega en Barbería Los Compas a las 5:30 pm. Folio C-10482.'),
  note('n3', 'pedido-listo', '2026-11-02T13:02', true, '/pedido/P-2264', 'Tu pedido P-2264 está listo para recoger', 'Recógelo en Barbería Los Compas, Av. Obregón y Calle 5. Muestra el folio al llegar.'),
  note('n2', 'recordatorio-1h', '2026-10-31T16:00', true, '/cita/C-10431', 'Tu cita es en 1 hora', 'Fade con Luis Ortega a las 5:00 pm en Barbería Los Compas.'),
  note('n1', 'recordatorio-24h', '2026-10-30T17:00', true, '/cita/C-10431', 'Mañana tienes cita a las 5:00 pm', 'Fade con Luis Ortega en Barbería Los Compas, Av. Obregón y Calle 5.'),
]

// ------------------------------------------------------ reviews and reports

const review = (id: string, branchId: string, employeeId: string | null, author: string, stars: number, on: string, service: string, text: string, reported: Review['reported'] = null, folio: string | null = null, clientEmail: string | null = null): Review => ({
  id, businessId: branches.find((b) => b.id === branchId)?.businessId ?? '', branchId, employeeId, folio, author, clientEmail, stars, on, service, text, reported,
})
// RF-M12, RF-W23: the latest reviews of each branch; two were reported to the Administrador.
const reviews: Review[] = [
  review('r6', 'los-compas-centro', 'luis', 'Usuario 4821', 1, '2026-11-10', 'Fade con Luis Ortega', 'Pésimo lugar, el barbero es un inútil y la dueña de enfrente también, no vayan, mejor vayan a la barbería de mi primo en la calle 8 (653 555 0192).'),
  review('r1', 'los-compas-centro', 'luis', 'Jorge Méndez', 5, '2026-11-04', 'Fade con Luis Ortega', 'Llegué a las 5:30 y a las 5:32 ya estaba en la silla. Luis dejó el fade parejo y me explicó cómo peinarlo en la casa.'),
  review('r2', 'los-compas-centro', 'ramon', 'Carlos Ríos', 5, '2026-11-01', 'Corte + barba con Ramón Cázares', 'Ramón trabaja la navaja con mucha calma. La barba me quedó definida sin irritación.'),
  review('r3', 'los-compas-centro', 'ramon', 'Daniela Paz', 3, '2026-10-28', 'Corte clásico con Ramón Cázares', 'Buen corte, pero esperé 15 minutos aunque tenía cita a las 12:00.'),
  review('a1', 'los-compas-centro', 'ramon', ANDREA.name, 5, '2026-10-17', 'Corte clásico con Ramón Cázares', 'Ramón trabaja con mucha calma.', null, 'C-10402', ANDREA.email),
  review('a2', 'los-compas-centro', 'ramon', ANDREA.name, 3, '2026-09-12', 'Corte + barba con Ramón Cázares', 'La barba quedó bien definida, pero la capa tenía cabello del cliente anterior.', null, 'C-10318', ANDREA.email),
  review('r8', 'los-compas-centro', 'ramon', 'Pedro Lugo', 1, '2026-10-15', 'Corte clásico con Ramón Cázares', 'Compren en la tienda online de cortes-baratos punto com, 50% de descuento en todo. Este negocio no sirve.', { reason: 'Publicidad o spam', detail: '', on: '2026-10-16T09:00', state: 'enviado' }),
  review('r4', 'los-compas-norte', 'oscar', 'Iván Soto', 5, '2026-11-06', 'Fade con Óscar Félix', 'Sin espera y el corte quedó igual que en la del centro.'),
  review('r5', 'los-compas-norte', 'oscar', 'Luz Gámez', 4, '2026-10-30', 'Corte clásico con Óscar Félix', 'Le corté el pelo a mi hijo de 8 años. Mucha paciencia con él.'),
  review('r7', 'los-compas-norte', 'oscar', 'Mario Leyva', 2, '2026-10-21', 'Corte + barba con Óscar Félix', 'El corte bien, pero la barba quedó dispareja y no me la quisieron retocar.'),
  review('m1', 'estudio-marisol', 'karla', 'Paola Robles', 5, '2026-11-07', 'Mechas con Karla Ruiz', 'Karla me hizo prueba de mechón antes de empezar. El tono quedó exacto al de la foto que le llevé.'),
  review('m3', 'estudio-marisol', 'fernanda', 'Mariana León', 5, '2026-11-03', 'Uñas acrílicas con Fernanda Lugo', 'Me duraron tres semanas sin levantarse.'),
  review('m2', 'estudio-marisol', 'fernanda', 'Paty Robles', 1, '2026-11-08', 'Uñas acrílicas con Fernanda Lugo', 'La que me atendió es una cochina y una ratera, ojalá le cierren el negocio. Su número es 653 110 2299 por si le quieren reclamar.', { reason: 'Datos personales de alguien', detail: 'Publica el teléfono personal de Fernanda y la insulta.', on: '2026-11-09T10:30', state: 'enviado' }),
]

// RF-W14, RF-M14: reports of clients. Andrea's two are the ones she sees in the app.
const reports: ClientReport[] = [
  { id: 'R-119', businessId: 'los-compas', employeeId: 'oscar', branchId: 'los-compas-norte', folio: 'C-10504', service: 'Fade', apptOn: '2026-11-11T17:00', client: 'Emilio Castro', clientEmail: null, reason: 'puntualidad', state: 'enviado', sentOn: '2026-11-12T09:15', text: 'Tenía cita a las 5:00 y Óscar me atendió a las 5:40. Nadie me avisó del retraso y tuve que irme corriendo al trabajo.', notes: [], changes: [] },
  { id: 'R-118', businessId: 'los-compas', employeeId: 'ramon', branchId: 'los-compas-centro', folio: 'C-10512', service: 'Corte + barba', apptOn: '2026-11-11T18:00', client: 'Héctor Villa', clientEmail: null, reason: 'trato', state: 'enviado', sentOn: '2026-11-11T19:40', text: 'Le pedí que me dejara más largo arriba y me contestó de mala gana que así no se usaba. Me sentí incómodo todo el corte.', notes: [], changes: [] },
  {
    id: 'R-102', businessId: 'los-compas', employeeId: 'luis', branchId: 'los-compas-centro', folio: 'C-10370', service: 'Fade', apptOn: '2026-10-03T18:00', client: ANDREA.name, clientEmail: ANDREA.email, reason: 'puntualidad', state: 'en revision', sentOn: '2026-10-03T19:05',
    text: 'Llegué a las 6:00 pm y Luis no estaba. Esperé 25 minutos y nadie me avisó que no iba a venir.',
    notes: [{ id: 'n1', on: '2026-10-04T10:20', author: 'Martín Salazar', text: 'Luis dice que tuvo una emergencia familiar y le avisó a Itzel, pero Itzel no le marcó a la clienta. Hablar con los dos.' }],
    changes: [{ on: '2026-10-04T10:18', state: 'en revision' }],
  },
  {
    id: 'R-088', businessId: 'los-compas', employeeId: 'ramon', branchId: 'los-compas-centro', folio: 'C-10318', service: 'Corte + barba', apptOn: '2026-09-12T16:00', client: ANDREA.name, clientEmail: ANDREA.email, reason: 'higiene', state: 'atendido', sentOn: '2026-09-12T18:30',
    text: 'La capa que me pusieron tenía cabello del cliente anterior y Ramón no la cambió cuando se lo dije.',
    notes: [{ id: 'n2', on: '2026-09-13T11:00', author: 'Martín Salazar', text: 'Se habló con Ramón. Desde hoy cada cliente lleva capa limpia; se compraron 6 capas más.' }],
    changes: [{ on: '2026-09-13T10:45', state: 'en revision' }, { on: '2026-09-14T09:30', state: 'atendido' }],
  },
  {
    id: 'R-071', businessId: 'los-compas', employeeId: 'luis', branchId: 'los-compas-centro', folio: 'C-10244', service: 'Arreglo de barba', apptOn: '2026-08-22T12:30', client: 'Raúl Quintero', clientEmail: null, reason: 'calidad', state: 'atendido', sentOn: '2026-08-22T15:10',
    text: 'El perfilado de la barba quedó chueco del lado izquierdo.',
    notes: [{ id: 'n3', on: '2026-08-23T10:00', author: 'Martín Salazar', text: 'Se le ofreció un arreglo sin costo; vino el 24 y quedó conforme.' }],
    changes: [{ on: '2026-08-23T09:50', state: 'en revision' }, { on: '2026-08-24T13:00', state: 'atendido' }],
  },
]

// A fresh copy of the whole sample database.
export function seedData(): DemoData {
  const data: DemoData = {
    accounts, businesses, plans, payments, branches, services, employees, products, stock, blocks,
    appointments: buildAppointments(),
    requests, invitations: [], stockMoves, orders, carts: [],
    // RF-W24, RN-09: $10 = 1 point in appointments and purchases, 1 point = $1.
    loyalty: Object.fromEntries(businesses.map((b) => [b.id, { pesosPerPointAppointments: 10, pesosPerPointPurchases: 10, pesosPerPointRedeemed: 1 }])),
    points, notifications, reviews, reports,
    salesHistory: buildSalesHistory(products, stock),
  }
  return JSON.parse(JSON.stringify(data)) as DemoData
}
