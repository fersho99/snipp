// Demo implementation of the Jefe's dashboard (RF-W22) and its notices
// (RF-W14, RF-W10, RF-W12). In production the API adds up the records of
// the database for the chosen branch and period. Here the sales are the
// orders of the shared data plus three months of sales history
// (shared/history.ts); appointments and ratings from 9 November on are the
// shared ones, and the earlier ones are generated the same every time, so a
// sale or an attended appointment of the demo shows up in the sums at once.
import { appointmentStart, fromIso, fromIsoDateTime } from '@shared/dates'
import { isPublished } from '@shared/feedback'
import { getData } from '@shared/store'
import { DEMO_TODAY } from '../data/demo'
import { getReportsStore } from './reports'
import { getStaffStore } from './staff'
import { ApiError } from './auth'
import { getDemoEstado } from './panel'
import type { AppointmentStatus, Employee } from '../types/domain'

interface DayRecord {
  date: Date
  appointments: { employeeId: string; branchId: string; status: AppointmentStatus }[]
  reviews: { employeeId: string; branchId: string; stars: number }[]
}
export interface Rating { average: number | null; count: number }
export interface AppointmentCounts { total: number; attended: number; cancelled: number; noShow: number; staffNoShow: number }
// RF-W22: what the dashboard shows for one branch and period.
export interface DashboardData {
  appointments: AppointmentCounts
  sales: { amount: number; orders: number; refunded: number }
  topProducts: { id: string; name: string; qty: number; amount: number }[]
  rating: Rating
  employees: (Employee & AppointmentCounts & { rating: Rating })[]
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Records start the day the business joined SNIPP in this demo.
export const RECORDS_START = new Date(2026, 7, 3)
// From this day on, appointments and reviews are the ones in the shared data.
const SHARED_FROM = new Date(2026, 10, 9)
const employees = () => getData().employees.filter((e) => e.status !== 'baja')

// Small seeded generator: same seed, same numbers.
function rng(seedText: string) {
  let h = 1779033703
  for (const ch of seedText) {
    h = Math.imul(h ^ ch.charCodeAt(0), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}
function pick<T>(r: () => number, weights: [T, number][]): T {
  let x = r() * weights.reduce((a, [, w]) => a + w, 0)
  for (const [v, w] of weights) if ((x -= w) < 0) return v
  return weights[weights.length - 1][0]
}
const key = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

// One entry per day: appointments and reviews per employee, orders per branch.
// Branches open Monday to Saturday; Sunday has no records.
const days: DayRecord[] = []
const generatedStaff = getData().employees.filter((e) => e.businessId === 'los-compas' && e.bookable)
for (let d = new Date(RECORDS_START); d < SHARED_FROM; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
  if (d.getDay() === 0) continue
  const day: DayRecord = { date: d, appointments: [], reviews: [] }
  for (const e of generatedStaff) {
    const r = rng(`${key(d)}-${e.id}`)
    const count = 3 + Math.floor(r() * 5) + (d.getDay() === 6 ? 3 : 0)
    for (let i = 0; i < count; i++) {
      const status = pick<AppointmentStatus>(r, [['atendida', 84], ['cancelada', 9], ['no-asistio', 5], ['empleado-no-se-presento', 0.6]])
      day.appointments.push({ employeeId: e.id, branchId: e.branchId, status })
      if (status === 'atendida' && r() < 0.24) {
        day.reviews.push({ employeeId: e.id, branchId: e.branchId, stars: pick(r, [[5, 62], [4, 25], [3, 8], [2, 3], [1, 2]]) })
      }
    }
  }
  days.push(day)
}

const inRange = (d: Date, from: Date, to: Date) => d >= from && d <= to
const average = (list: { stars: number }[]) => (list.length ? Math.round((list.reduce((a, x) => a + x.stars, 0) / list.length) * 10) / 10 : null)

function summarize(branchId: string, from: Date, until: Date): DashboardData {
  // The period includes its whole last day (today's sales too).
  const to = new Date(until.getFullYear(), until.getMonth(), until.getDate(), 23, 59, 59)
  const data = getData()
  const span = days.filter((d) => inRange(d.date, from, to))
  // Appointments that already happened (before now) and reviews, from the shared data.
  const shared = data.appointments.filter((a) => a.branchId === branchId && appointmentStart(a) >= SHARED_FROM && appointmentStart(a) < DEMO_TODAY && inRange(appointmentStart(a), from, to))
  const sharedReviews = data.reviews.filter((r) => r.branchId === branchId && isPublished(r) && r.employeeId && fromIso(r.on) >= SHARED_FROM && inRange(fromIso(r.on), from, to))
  const appts = [...span.flatMap((d) => d.appointments).filter((a) => a.branchId === branchId), ...shared.map((a) => ({ employeeId: a.employeeId, branchId: a.branchId, status: a.status }))]
  const reviews = [...span.flatMap((d) => d.reviews).filter((x) => x.branchId === branchId), ...sharedReviews.map((r) => ({ employeeId: r.employeeId as string, branchId: r.branchId, stars: r.stars }))]
  // Sales: the history of each day plus the orders paid in the demo. A
  // cancelled order is refunded and does not count (RN-06).
  const history = data.salesHistory.filter((x) => x.branchId === branchId && inRange(fromIso(x.date), from, to))
  const orders = data.orders.filter((o) => o.branchId === branchId && inRange(fromIsoDateTime(o.timeline[0][1]), from, to))
  const paid = orders.filter((o) => o.status !== 'cancelado')
  const count = (list: { status: AppointmentStatus }[], status: AppointmentStatus) => list.filter((a) => a.status === status).length
  const soldItems = [...history.flatMap((x) => x.items), ...paid.flatMap((o) => o.items)]

  const byProduct: Record<string, { qty: number; amount: number }> = {}
  for (const it of soldItems) {
    byProduct[it.productId] ??= { qty: 0, amount: 0 }
    byProduct[it.productId].qty += it.qty
    byProduct[it.productId].amount += it.qty * it.price
  }

  return {
    appointments: {
      total: appts.length,
      attended: count(appts, 'atendida'),
      cancelled: count(appts, 'cancelada'),
      noShow: count(appts, 'no-asistio'),
      staffNoShow: count(appts, 'empleado-no-se-presento'),
    },
    sales: {
      amount: soldItems.reduce((a, it) => a + it.qty * it.price, 0) - paid.reduce((a, o) => a + o.discount, 0),
      orders: paid.length + history.reduce((a, x) => a + x.orders, 0),
      refunded: orders.length - paid.length + history.reduce((a, x) => a + x.refunded, 0),
    },
    topProducts: Object.entries(byProduct)
      .map(([id, v]) => {
        const p = data.products.find((x) => x.id === id)
        return { id, name: p ? (p.size ? `${p.name} ${p.size}` : p.name) : id, ...v }
      })
      .sort((a, b) => b.qty - a.qty || b.amount - a.amount),
    rating: { average: average(reviews), count: reviews.length },
    employees: employees()
      .filter((e) => e.branchId === branchId)
      .map(({ id, name, specialty, businessId, branchId: b, bookable }) => ({ id, name, specialty, businessId, branchId: b, bookable }))
      .map((e) => {
        const mine = appts.filter((a) => a.employeeId === e.id)
        const myReviews = reviews.filter((x) => x.employeeId === e.id)
        return {
          ...e,
          total: mine.length,
          attended: count(mine, 'atendida'),
          cancelled: count(mine, 'cancelada'),
          noShow: count(mine, 'no-asistio'),
          staffNoShow: count(mine, 'empleado-no-se-presento'),
          rating: { average: average(myReviews), count: myReviews.length },
        }
      }),
  }
}

// States the screen index can force on this page:
//   cargando-metricas | error-metricas | sin-datos | sin-pendientes
export async function loadDashboard(branchId: string, from: Date, to: Date): Promise<DashboardData> {
  const estado = getDemoEstado()
  if (estado === 'cargando-metricas') return new Promise(() => {})
  await wait(450)
  if (estado === 'error-metricas') throw new ApiError('server')
  if (estado === 'sin-datos') return summarize(branchId, new Date(2000, 0, 1), new Date(2000, 0, 1))
  return summarize(branchId, from, to)
}

// Notices for the whole business, not only the selected branch.
export function pendingFor(businessId: string) {
  if (getDemoEstado() === 'sin-pendientes') return { reports: [], requests: [] }
  return {
    reports: getReportsStore().reports.filter((r) => r.businessId === businessId && r.state === 'enviado'),
    requests: getStaffStore().requests.filter((s) => s.businessId === businessId),
  }
}

export const employeeName = (id: string) => getData().employees.find((e) => e.id === id)?.name ?? ''
