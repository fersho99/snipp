// Domain records of the simulated database shared by the client app and the
// web panel. Everything here is plain JSON (no Date objects), so it can be
// saved in localStorage as is. The real API will return the same records.

// Opening or work hours per weekday, Sunday (0) to Saturday (6), like
// Date.getDay(). null = closed / day off. Times are "HH:MM", 24 h.
export type DayHours = [string, string] | null
export type WeekHours = DayHours[]

export interface Business {
  id: string
  name: string
  kind: string
}

export interface Branch {
  id: string
  businessId: string
  name: string
  address: string
  neighborhood: string
  phone: string
  description: string
  hours: WeekHours
  serviceIds: string[]
}

export interface Service {
  id: string
  name: string
  description: string
  minutes: number
  price: number
}

// RF-W10, RF-W11: `bookable` is false for staff clients do not book with
// (front desk). `serviceIds`: what the Empleado performs.
export interface Employee {
  id: string
  name: string
  specialty: string
  email: string
  businessId: string
  branchId: string
  bookable: boolean
  schedule: WeekHours
  serviceIds: string[]
}

export interface Client {
  firstName: string
  name: string
  email: string
  phone: string
}

// RF-W19: the same product sold at several branches, each with its stock.
export interface Product {
  id: string
  name: string
  size: string
  price: number
  description: string
  howTo: string
}

// Days off and breaks blocked in the agenda (RF-W15). from/to: "YYYY-MM-DDTHH:MM".
export interface Block {
  id: string
  employeeId: string
  branchId: string
  from: string
  to: string
  reason: string
}

// RF-M06 to RF-M08, RF-W15 to RF-W18. 'cambio': the business changed the
// date, time or Empleado and the client has not answered yet (RN-04).
export type AppointmentStatus = 'confirmada' | 'cambio' | 'atendida' | 'no-asistio' | 'empleado-no-se-presento' | 'cancelada'
export type CancelledBy = 'cliente' | 'Jefe' | 'Empleado'

export interface AppointmentReport {
  sentOn: string
  state: 'enviado' | 'en revisión' | 'atendido'
  reason: string
  text: string
}

export interface Appointment {
  folio: string
  branchId: string
  employeeId: string
  serviceId: string
  // YYYY-MM-DD and minutes from midnight. Always the current date and time:
  // during a change they are the new ones and `previous` keeps the old ones.
  date: string
  start: number
  clientName: string
  clientEmail: string | null
  status: AppointmentStatus
  cancelledBy?: CancelledBy
  // RF-M08: what the appointment was before the business changed it.
  previous?: { employeeId: string; date: string; start: number } | null
  // Message of the business with a change or a cancellation, and when.
  note?: string
  changedAt?: string
  // RF-M07: start before the client rescheduled it (amber label).
  rescheduledFrom?: number | null
  review?: { stars: number; text: string } | null
  report?: AppointmentReport | null
}

export interface DemoData {
  businesses: Business[]
  branches: Branch[]
  services: Service[]
  employees: Employee[]
  clients: Client[]
  products: Product[]
  // branchId -> productId -> pieces.
  stock: Record<string, Record<string, number>>
  blocks: Block[]
  appointments: Appointment[]
}
