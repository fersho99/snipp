// Sample data for the web panel. Same story as the mobile app
// (frontend/mobile/src/data/demo.js): "today" is Thursday 12 November 2026.
export const DEMO_TODAY = new Date(2026, 10, 12, 10, 0)

// Subscription plans the Administrator manages (RF-W27). A plan created
// there shows up here as an option when a Jefe registers. Prices are examples.
export const plans = [
  { id: 'mensual', name: 'Mensual', price: 499, months: 1 },
  { id: 'semestral', name: 'Semestral', price: 2694, months: 6 },
  { id: 'anual', name: 'Anual', price: 4990, months: 12 },
]

// Businesses with their branches and subscription (RF-W05, RF-W25, RN-13).
// subscription.kind: 'prueba' (free first month) or 'pagada' (a paid plan).
// endsOn is the last day covered; after it, without payment, it is overdue.
export const businesses = {
  'los-compas': {
    id: 'los-compas',
    name: 'Barbería Los Compas',
    branches: [
      { id: 'los-compas-centro', name: 'Los Compas Centro', address: 'Av. Obregón y Calle 5', active: true },
      { id: 'los-compas-norte', name: 'Los Compas Norte', address: 'Av. Libertad y Calle 32', active: true },
    ],
    subscription: { kind: 'pagada', planId: 'mensual', endsOn: new Date(2026, 11, 3) },
  },
}

// Demo accounts. The password for all of them is in frontend/README.md.
export const DEMO_PASSWORD = 'snipp2026'
export const accounts = [
  { email: 'admin@snipp.mx', role: 'admin', name: 'Daniela Ibarra', businessId: null },
  { email: 'martin.salazar@loscompas.mx', role: 'jefe', name: 'Martín Salazar', businessId: 'los-compas' },
  { email: 'luis.ortega@gmail.com', role: 'empleado', name: 'Luis Ortega', businessId: 'los-compas', branchId: 'los-compas-centro' },
  { email: 'sofia.ramos@gmail.com', role: 'empleado', name: 'Sofía Ramos', businessId: null },
]

export const ROLE_LABEL = { admin: 'Administrador de SNIPP', jefe: 'Jefe', empleado: 'Empleado' }
