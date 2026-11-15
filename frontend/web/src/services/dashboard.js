// Demo implementation of the Jefe's dashboard (RF-W22) and its notices
// (RF-W14, RF-W10, RF-W12). In production the API adds up the records of
// the database for the chosen branch and period; here the records are
// generated once, the same every time, so any period gives consistent sums.
import { branchProducts, DEMO_TODAY, employees, newReports, pendingRequests, products } from '../data/demo'
import { ApiError } from './auth'
import { getDemoEstado } from './panel'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// Records start the day the business joined SNIPP in this demo.
export const RECORDS_START = new Date(2026, 7, 3)
const YESTERDAY = new Date(DEMO_TODAY.getFullYear(), DEMO_TODAY.getMonth(), DEMO_TODAY.getDate() - 1)

// Small seeded generator: same seed, same numbers.
function rng(seedText) {
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
const pick = (r, weights) => {
  let x = r() * weights.reduce((a, [, w]) => a + w, 0)
  for (const [v, w] of weights) if ((x -= w) < 0) return v
  return weights[weights.length - 1][0]
}
const key = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

// One entry per day: appointments and reviews per employee, orders per branch.
// Branches open Monday to Saturday; Sunday has no records.
const days = []
for (let d = new Date(RECORDS_START); d <= YESTERDAY; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
  if (d.getDay() === 0) continue
  const day = { date: d, appointments: [], reviews: [], orders: [] }
  for (const e of employees.filter((x) => x.bookable)) {
    const r = rng(`${key(d)}-${e.id}`)
    const count = 3 + Math.floor(r() * 5) + (d.getDay() === 6 ? 3 : 0)
    for (let i = 0; i < count; i++) {
      const status = pick(r, [['atendida', 84], ['cancelada', 9], ['no-asistio', 5], ['empleado-no-se-presento', 0.6]])
      day.appointments.push({ employeeId: e.id, branchId: e.branchId, status })
      if (status === 'atendida' && r() < 0.24) {
        day.reviews.push({ employeeId: e.id, branchId: e.branchId, stars: pick(r, [[5, 62], [4, 25], [3, 8], [2, 3], [1, 2]]) })
      }
    }
  }
  for (const [branchId, ids] of Object.entries(branchProducts)) {
    const r = rng(`${key(d)}-${branchId}-orders`)
    const count = pick(r, [[0, 35], [1, 35], [2, 20], [3, 10]])
    for (let i = 0; i < count; i++) {
      const items = []
      const lines = r() < 0.75 ? 1 : 2
      for (let j = 0; j < lines; j++) {
        const productId = ids[Math.floor(r() * ids.length)]
        const p = products.find((x) => x.id === productId)
        items.push({ productId: p.id, qty: r() < 0.85 ? 1 : 2, price: p.price })
      }
      // RN-06: a paid order that is cancelled is refunded; it does not count as a sale.
      day.orders.push({ branchId, items, cancelled: r() < 0.05 })
    }
  }
  days.push(day)
}

const inRange = (d, from, to) => d >= from && d <= to
const average = (list) => (list.length ? Math.round((list.reduce((a, x) => a + x.stars, 0) / list.length) * 10) / 10 : null)

function summarize(branchId, from, to) {
  const span = days.filter((d) => inRange(d.date, from, to))
  const appts = span.flatMap((d) => d.appointments).filter((a) => a.branchId === branchId)
  const reviews = span.flatMap((d) => d.reviews).filter((x) => x.branchId === branchId)
  const orders = span.flatMap((d) => d.orders).filter((o) => o.branchId === branchId)
  const paid = orders.filter((o) => !o.cancelled)
  const count = (list, status) => list.filter((a) => a.status === status).length

  const byProduct = {}
  for (const it of paid.flatMap((o) => o.items)) {
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
      amount: paid.reduce((a, o) => a + o.items.reduce((s, it) => s + it.qty * it.price, 0), 0),
      orders: paid.length,
      refunded: orders.length - paid.length,
    },
    topProducts: Object.entries(byProduct)
      .map(([id, v]) => ({ id, name: products.find((p) => p.id === id).name, ...v }))
      .sort((a, b) => b.qty - a.qty || b.amount - a.amount),
    rating: { average: average(reviews), count: reviews.length },
    employees: employees
      .filter((e) => e.branchId === branchId)
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
export async function loadDashboard(branchId, from, to) {
  const estado = getDemoEstado()
  if (estado === 'cargando-metricas') return new Promise(() => {})
  await wait(450)
  if (estado === 'error-metricas') throw new ApiError('server')
  if (estado === 'sin-datos') return summarize(branchId, new Date(2000, 0, 1), new Date(2000, 0, 1))
  return summarize(branchId, from, to)
}

// Notices for the whole business, not only the selected branch.
export function pendingFor(businessId) {
  if (getDemoEstado() === 'sin-pendientes') return { reports: [], requests: [] }
  return {
    reports: newReports.filter((r) => r.businessId === businessId),
    requests: pendingRequests.filter((s) => s.businessId === businessId),
  }
}

export const employeeName = (id) => employees.find((e) => e.id === id)?.name ?? ''
