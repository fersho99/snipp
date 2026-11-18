// Domain types of the SNIPP web panel (SRS v1.1). The demo stores in
// src/services use them today; the real API will return the same shapes.

export type Role = 'admin' | 'jefe' | 'empleado'

// Opening or work hours per weekday, Sunday (0) to Saturday (6), like
// Date.getDay(). null = closed / day off. Times are "HH:MM", 24 h.
export type DayHours = [string, string] | null
export type WeekHours = DayHours[]

// RF-W07, RN-14: inactive services are not offered in the app.
export interface Service {
  id: string
  name: string
  description: string
  minutes: number
  price: number
  active: boolean
}

export interface BranchImage {
  id: string
  src: string
  name: string
}

// RF-W05 to RF-W09.
export interface Branch {
  id: string
  name: string
  address: string
  phone: string
  description: string
  hours: WeekHours
  images: BranchImage[]
  coverId: string | null
  active: boolean
  // Appointments already booked from today on (shown before deactivating).
  upcoming: number
  services: Service[]
}

// RF-W25, RN-13: 'prueba' is the free first month; 'pagada' a paid plan.
// endsOn is the last day covered.
export interface Subscription {
  kind: 'prueba' | 'pagada'
  planId: string
  endsOn: Date
}

export interface Business {
  id: string
  name: string
  // RF-W08: hours before an appointment that clients can still cancel or reschedule.
  minNoticeHours: number
  branches: Branch[]
  subscription: Subscription
}

// A business registered in this session keeps endsOn as an ISO string
// until the panel loads it.
export type StoredBusiness = Omit<Business, 'subscription'> & {
  subscription: Omit<Subscription, 'endsOn'> & { endsOn: Date | string }
}

// RF-W27: plans the Administrator manages.
export interface Plan {
  id: string
  name: string
  price: number
  months: number
  offered?: boolean
}

export interface Session {
  email: string
  role: Role
  name: string
  businessId: string | null
  branchId?: string
  phone?: string
  planId?: string
  business?: StoredBusiness
  // RF-W26: the overdue-payment message was already shown at sign-in.
  overdueSeen?: boolean
}

// Where the subscription stands today (RF-W25, RF-W26, RN-13).
export interface SubscriptionStatus {
  status: 'al-dia' | 'por-vencer' | 'vencida'
  daysLeft: number
}

// Live branches and settings of a business (RF-W05 to RF-W09).
export interface BusinessSetup {
  minNoticeHours: number
  branches: Branch[]
}

// RF-W10: Empleados linked to each branch. `bookable` is false for staff
// clients do not book with (front desk).
export interface Employee {
  id: string
  name: string
  specialty: string
  businessId: string
  branchId: string
  bookable: boolean
}

// RF-W11: profile the Empleado edits, and their work schedule.
export interface StaffProfile {
  displayName: string
  specialties: string[]
  schedule: WeekHours
  photo?: string | null
}

// RF-W15 to RF-W18. 'cambio': the business changed date, time or Empleado
// and the client has not answered yet (RN-04).
export type AppointmentStatus = 'confirmada' | 'cambio' | 'atendida' | 'no-asistio' | 'empleado-no-se-presento' | 'cancelada'

export interface Appointment {
  folio: string
  employeeId: string
  branchId: string
  service: string
  minutes: number
  start: Date
  client: string
  status: AppointmentStatus
  cancelledBy?: string
  // Pending change proposed by the business (RN-04).
  proposal?: { start?: Date; employeeId?: string }
}

// Days off and breaks blocked in the agenda (RF-W15).
export interface Block {
  id: string
  employeeId: string
  branchId: string
  from: Date
  to: Date
  reason: string
}

// RF-W17: each confirmation, cancellation and reschedule, with who did it.
export type HistoryAction = 'confirmada' | 'cancelada' | 'reagendada'
export interface HistoryEvent {
  id: string
  employeeId?: string
  folio: string
  service: string
  action: HistoryAction | string
  by: string
  on: Date
}

// Other businesses on SNIPP (RF-W10, RF-W12).
export interface DirectoryBusiness {
  id: string
  name: string
  branches: { id: string; name: string }[]
}
