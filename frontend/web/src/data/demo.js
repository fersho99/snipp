// Sample data for the web panel. Same story as the mobile app
// (frontend/mobile/src/data/demo.js): "today" is Thursday 12 November 2026.
import interior from '../assets/photos/barberia-interior.jpg'
import fade from '../assets/photos/trabajo-fade.jpg'

export const DEMO_TODAY = new Date(2026, 10, 12, 10, 0)

// Subscription plans the Administrator manages (RF-W27). A plan created
// there shows up here as an option when a Jefe registers. Prices are examples.
export const plans = [
  { id: 'mensual', name: 'Mensual', price: 499, months: 1 },
  { id: 'semestral', name: 'Semestral', price: 2694, months: 6 },
  { id: 'anual', name: 'Anual', price: 4990, months: 12 },
]

// Business hours per weekday, Sunday first (0) to Saturday (6), like Date.getDay().
// null = closed. Same hours as the branch profiles in the mobile app.
const MON_SAT = [null, ['10:00', '20:00'], ['10:00', '20:00'], ['10:00', '20:00'], ['10:00', '20:00'], ['10:00', '20:00'], ['10:00', '18:00']]

// Services of each branch (RF-W07). Inactive ones are not offered in the app (RN-14).
const BARBER_SERVICES = [
  { id: 'corte-clasico', name: 'Corte clásico', description: 'Corte con tijera y máquina, lavado y peinado.', minutes: 40, price: 180, active: true },
  { id: 'fade', name: 'Fade', description: 'Degradado a máquina desde cero, con navaja en el contorno.', minutes: 45, price: 220, active: true },
  { id: 'barba', name: 'Arreglo de barba', description: 'Perfilado con navaja y toalla caliente.', minutes: 25, price: 120, active: true },
  { id: 'corte-barba', name: 'Corte + barba', description: 'Corte clásico o fade más arreglo de barba.', minutes: 60, price: 280, active: true },
]

// Businesses with their branches, settings and subscription (RF-W05 to
// RF-W09, RF-W25, RN-13).
// minNoticeHours: how long before an appointment clients can still cancel
// or reschedule in the app (RF-W08, 2 hours by default).
// subscription.kind: 'prueba' (free first month) or 'pagada' (a paid plan).
// endsOn is the last day covered; after it, without payment, it is overdue.
// upcoming: appointments already booked from today on (shown before deactivating).
export const businesses = {
  'los-compas': {
    id: 'los-compas',
    name: 'Barbería Los Compas',
    minNoticeHours: 2,
    branches: [
      {
        id: 'los-compas-centro',
        name: 'Los Compas Centro',
        address: 'Av. Obregón y Calle 5, Col. Centro',
        phone: '653 534 2210',
        description: 'Barbería de barrio desde 2014. Fades, cortes clásicos y arreglo de barba con toalla caliente. Hay café mientras esperas y estacionamiento en la Calle 5.',
        hours: MON_SAT,
        images: [
          { id: 'img-1', src: interior, name: 'barberia-interior.jpg' },
          { id: 'img-2', src: fade, name: 'trabajo-fade.jpg' },
        ],
        coverId: 'img-1',
        active: true,
        upcoming: 23,
        services: BARBER_SERVICES.map((x) => ({ ...x })),
      },
      {
        id: 'los-compas-norte',
        name: 'Los Compas Norte',
        address: 'Av. Libertad y Calle 32, Col. Burócrata',
        phone: '653 536 1184',
        description: 'La segunda sucursal de Los Compas, con los mismos precios. Más tranquila entre semana antes de las 4:00 pm.',
        hours: MON_SAT,
        images: [
          { id: 'img-3', src: fade, name: 'trabajo-fade.jpg' },
          { id: 'img-4', src: interior, name: 'barberia-interior.jpg' },
        ],
        coverId: 'img-3',
        active: true,
        upcoming: 9,
        services: BARBER_SERVICES.map((x) => ({ ...x })),
      },
    ],
    subscription: { kind: 'pagada', planId: 'mensual', endsOn: new Date(2026, 11, 3) },
  },
}

// Employees linked to each branch (RF-W10). Itzel works the front desk, so
// clients do not book appointments with her.
export const employees = [
  { id: 'luis', name: 'Luis Ortega', specialty: 'Fades y barba', businessId: 'los-compas', branchId: 'los-compas-centro', bookable: true },
  { id: 'ramon', name: 'Ramón Cázares', specialty: 'Corte clásico, navaja', businessId: 'los-compas', branchId: 'los-compas-centro', bookable: true },
  { id: 'itzel', name: 'Itzel Duarte', specialty: 'Recepción', businessId: 'los-compas', branchId: 'los-compas-centro', bookable: false },
  { id: 'oscar', name: 'Óscar Félix', specialty: 'Fades y diseños', businessId: 'los-compas', branchId: 'los-compas-norte', bookable: true },
]

// Store products of each branch (RF-W19). Same catalog as the mobile app.
export const products = [
  { id: 'pomada', name: 'Pomada mate 100 g', price: 230 },
  { id: 'aceite', name: 'Aceite para barba 30 ml', price: 190 },
  { id: 'shampoo', name: 'Shampoo matizador 300 ml', price: 310 },
  { id: 'cera', name: 'Cera fijación media', price: 210 },
]
export const branchProducts = {
  'los-compas-centro': ['pomada', 'aceite', 'shampoo', 'cera'],
  'los-compas-norte': ['pomada', 'cera'],
}

// Client reports the Jefe has not opened yet (RF-W14). Each one is a notice
// in the panel until the Jefe reviews it in Reportes (batch W7).
export const newReports = [
  { id: 'R-118', businessId: 'los-compas', employeeId: 'ramon', branchId: 'los-compas-centro', reason: 'Trato', folio: 'C-10512', receivedOn: new Date(2026, 10, 11, 19, 40) },
  { id: 'R-119', businessId: 'los-compas', employeeId: 'oscar', branchId: 'los-compas-norte', reason: 'Puntualidad', folio: 'C-10520', receivedOn: new Date(2026, 10, 12, 9, 15) },
]

// Requests waiting for the Jefe: to join a branch (RF-W10) or to migrate
// from another business (RF-W12). Unanswered, they expire after 7 days (RN-11).
export const pendingRequests = [
  { id: 'S-31', businessId: 'los-compas', kind: 'ingreso', name: 'Sofía Ramos', branchId: 'los-compas-centro', sentOn: new Date(2026, 10, 10) },
  { id: 'S-32', businessId: 'los-compas', kind: 'migracion', name: 'Diego Armenta', from: 'Barbería El Faro', branchId: 'los-compas-norte', sentOn: new Date(2026, 10, 6) },
]

// Demo accounts. The password for all of them is in frontend/README.md.
export const DEMO_PASSWORD = 'snipp2026'
export const accounts = [
  { email: 'admin@snipp.mx', role: 'admin', name: 'Daniela Ibarra', businessId: null },
  { email: 'martin.salazar@loscompas.mx', role: 'jefe', name: 'Martín Salazar', businessId: 'los-compas' },
  { email: 'luis.ortega@gmail.com', role: 'empleado', name: 'Luis Ortega', businessId: 'los-compas', branchId: 'los-compas-centro' },
  { email: 'sofia.ramos@gmail.com', role: 'empleado', name: 'Sofía Ramos', businessId: null },
]

export const ROLE_LABEL = { admin: 'Administrador de SNIPP', jefe: 'Jefe', empleado: 'Empleado' }
