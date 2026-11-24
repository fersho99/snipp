// Three months of store sales before the demo starts (RF-W22), so the
// dashboard of a branch has numbers from the first day. One entry per branch
// and day, built the same way every time. Sales made in the demo are the
// orders themselves (store.ts), so the dashboard adds both.
import { iso } from './dates'
import type { DaySales, Product } from './types'

// The sales history covers 12 August to 11 November 2026, the day before
// the demo's "today". Branches sell Monday to Saturday.
export const HISTORY_FROM = new Date(2026, 7, 12)
export const HISTORY_TO = new Date(2026, 10, 11)

function rng(seed: string) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

// Only Los Compas sold in the store during those months.
const SELLING = ['los-compas-centro', 'los-compas-norte']

export function buildSalesHistory(products: Product[], stock: Record<string, Record<string, number>>): DaySales[] {
  const out: DaySales[] = []
  for (let d = new Date(HISTORY_FROM); d <= HISTORY_TO; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    if (d.getDay() === 0) continue
    for (const branchId of SELLING) {
      const ids = Object.keys(stock[branchId] ?? {})
      const r = rng(`${iso(d)}-${branchId}-ventas`)
      const x = r()
      const count = x < 0.35 ? 0 : x < 0.7 ? 1 : x < 0.9 ? 2 : 3
      const day: DaySales = { date: iso(d), branchId, items: [], orders: 0, refunded: 0 }
      for (let i = 0; i < count; i++) {
        // RN-06: a cancelled order is refunded and does not count as a sale.
        if (r() < 0.05) {
          day.refunded += 1
          continue
        }
        day.orders += 1
        const lines = r() < 0.75 ? 1 : 2
        for (let j = 0; j < lines; j++) {
          const p = products.find((x) => x.id === ids[Math.floor(r() * ids.length)])
          if (!p) continue
          const qty = r() < 0.85 ? 1 : 2
          const same = day.items.find((it) => it.productId === p.id)
          if (same) same.qty += qty
          else day.items.push({ productId: p.id, qty, price: p.price })
        }
      }
      if (day.orders || day.refunded) out.push(day)
    }
  }
  return out
}
