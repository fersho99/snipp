// Domain records of the simulated database shared by the client app and the
// web panel. Everything here is plain JSON (no Date objects), so it can be
// saved in localStorage as is. The real API will return the same records.

// Opening or work hours per weekday, Sunday (0) to Saturday (6), like
// Date.getDay(). null = closed / day off. Times are "HH:MM", 24 h.
export type DayHours = [string, string] | null
export type WeekHours = DayHours[]

// RF-W25, RF-W28, RN-13: 'prueba' is the free first month, 'pagada' a paid
// plan. endsOn ("YYYY-MM-DD") is the last day covered.
export interface BusinessSubscription {
  kind: 'prueba' | 'pagada'
  planId: string
  endsOn: string
}

// RF-W08: minNoticeHours, how long before an appointment the client can
// still cancel or reschedule in the app. joinedOn: "YYYY-MM-DD".
export interface Business {
  id: string
  name: string
  kind: string
  subscription: BusinessSubscription
  suspended: boolean
  minNoticeHours: number
  joinedOn: string
}

// RF-W27: plans the Administrador manages.
export interface Plan {
  id: string
  name: string
  price: number
  months: number
  offered: boolean
}

// RF-W25, RN-17: a subscription payment; only the Stripe reference is kept.
export interface SubscriptionPayment {
  id: string
  businessId: string
  on: string
  planId: string
  amount: number
  ref: string
}

// RF-M01, RF-W01 to RF-W04. The password is kept only as a salted hash
// (RNF-G01). The client app accepts 'cliente'; the panel the other roles.
export type Role = 'cliente' | 'admin' | 'jefe' | 'empleado'
export interface Account {
  email: string
  role: Role
  name: string
  phone: string
  businessId: string | null
  branchId: string | null
  salt: string
  passwordHash: string
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
  // RF-W09, RN-14: a deactivated branch or service is not offered in the app.
  active: boolean
  inactiveServiceIds: string[]
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
  // RF-W12: an Empleado migrating to another business keeps working here
  // until their last appointment.
  status: 'activo' | 'migracion-pendiente' | 'baja'
  migration: { to: string; acceptedOn: string } | null
  // RF-W11: what the Empleado shows clients in their profile.
  displayName: string
  specialties: string[]
}

// RF-W10, RF-W12: an Empleado asks to join a branch or to migrate to it.
// Unanswered, it expires after 7 days (RN-11).
export interface JoinRequest {
  id: string
  businessId: string
  branchId: string
  kind: 'ingreso' | 'migracion'
  name: string
  email: string
  from?: string
  sentOn: string
  status: 'enviada' | 'aceptada' | 'rechazada' | 'caducada'
}

// RF-W10: the Jefe invites an Empleado by email.
export interface Invitation {
  id: string
  email: string
  businessId: string
  branchId: string
  sentOn: string
}

// RF-W19: the same product sold at several branches, each with its stock.
export interface Product {
  id: string
  name: string
  size: string
  price: number
  description: string
  howTo: string
  // Web path of its photo; the app has its own photos by product id.
  photo: string | null
}

// RF-W20: every change of stock with its reason. on: "YYYY-MM-DDTHH:MM".
export interface StockMove {
  id: string
  branchId: string
  productId: string
  on: string
  change: number
  reason: string
}

// RF-M10, RF-M11, RF-W20, RF-W21, RN-06, RN-17.
export type OrderStatus = 'pagado' | 'listo' | 'entregado' | 'cancelado'
export interface OrderLine {
  productId: string
  name: string
  qty: number
  price: number
}
export interface Order {
  folio: string
  businessId: string
  branchId: string
  clientName: string
  clientEmail: string | null
  items: OrderLine[]
  pointsUsed: number
  discount: number
  paymentRef: string
  status: OrderStatus
  refund?: { amount: number; ref: string; reason: string }
  timeline: [OrderStatus, string][]
}

// RF-M09, RN-06, RN-18: the client's carts, one per branch, up to 3.
export interface CartItem {
  productId: string
  qty: number
  price: number
}
export interface Cart {
  clientEmail: string
  branchId: string
  items: CartItem[]
  updatedAt: number
  warned?: boolean
}

// RF-W24, RN-09.
export interface LoyaltyRules {
  pesosPerPointAppointments: number
  pesosPerPointPurchases: number
  pesosPerPointRedeemed: number
}
// RF-M15: points earned or spent in one business. on: "YYYY-MM-DD".
export interface PointsMovement {
  id: string
  clientEmail: string
  businessId: string
  points: number
  label: string
  on: string
  route: string
}

// RF-M16: what the client receives as a push. at: "YYYY-MM-DDTHH:MM".
export type NotificationKind = 'confirmacion' | 'recordatorio-24h' | 'recordatorio-1h' | 'cambio' | 'cancelacion' | 'reagendada' | 'pedido-listo' | 'pedido-cancelado' | 'reporte' | 'carrito-por-vaciar' | 'carrito-vaciado'
export interface ClientNotification {
  id: string
  clientEmail: string
  kind: NotificationKind
  title: string
  body: string
  route: string
  at: string
  read: boolean
}

// RF-M12, RF-W23, RF-W28: a published review; the Jefe can report it to the
// Administrador, who removes it or keeps it.
export interface ReviewReport {
  reason: string
  detail: string
  on: string
  state: 'enviado' | 'eliminada' | 'mantenida'
  decidedOn?: string
}
export interface Review {
  id: string
  businessId: string
  branchId: string
  employeeId: string | null
  folio: string | null
  author: string
  clientEmail: string | null
  stars: number
  on: string
  service: string
  text: string
  reported: ReviewReport | null
}

// RF-M13, RF-M14, RF-W14, RN-15, RN-16: a client's report about an Empleado.
export type ReportState = 'enviado' | 'en revision' | 'atendido'
export interface ClientReport {
  id: string
  businessId: string
  branchId: string
  employeeId: string
  folio: string
  service: string
  apptOn: string
  client: string
  clientEmail: string | null
  reason: string
  state: ReportState
  sentOn: string
  text: string
  notes: { id: string; on: string; author: string; text: string }[]
  changes: { on: string; state: ReportState }[]
}

// RF-W22: the sales of one branch on one day before the demo (3 months of
// history for the dashboard). Newer sales are the orders themselves.
export interface DaySales {
  date: string
  branchId: string
  items: { productId: string; qty: number; price: number }[]
  orders: number
  refunded: number
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
  accounts: Account[]
  businesses: Business[]
  plans: Plan[]
  payments: SubscriptionPayment[]
  branches: Branch[]
  services: Service[]
  employees: Employee[]
  products: Product[]
  // branchId -> productId -> pieces.
  stock: Record<string, Record<string, number>>
  blocks: Block[]
  appointments: Appointment[]
  requests: JoinRequest[]
  invitations: Invitation[]
  stockMoves: StockMove[]
  orders: Order[]
  carts: Cart[]
  loyalty: Record<string, LoyaltyRules>
  points: PointsMovement[]
  notifications: ClientNotification[]
  reviews: Review[]
  reports: ClientReport[]
  salesHistory: DaySales[]
}
