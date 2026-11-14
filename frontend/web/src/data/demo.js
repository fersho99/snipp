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

// Demo accounts (one per role). The password for all of them is in frontend/README.md.
export const DEMO_PASSWORD = 'snipp2026'
export const accounts = [
  { email: 'admin@snipp.mx', role: 'admin', name: 'Daniela Ibarra', business: null },
  { email: 'martin.salazar@loscompas.mx', role: 'jefe', name: 'Martín Salazar', business: 'Barbería Los Compas' },
  { email: 'luis.ortega@gmail.com', role: 'empleado', name: 'Luis Ortega', business: 'Barbería Los Compas' },
]

export const ROLE_LABEL = { admin: 'Administrador de SNIPP', jefe: 'Jefe', empleado: 'Empleado' }
