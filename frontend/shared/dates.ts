// Date helpers for the records of the simulated database, which keep dates
// as text ("YYYY-MM-DD", "YYYY-MM-DDTHH:MM") and times as minutes from midnight.

// Demo "today": Thursday 12 November 2026, 10:00 am. Booking is open up to
// two months later, 12 January 2027 (RN-02).
export const DEMO_TODAY = new Date(2026, 10, 12, 10, 0)

const pad = (n: number) => String(n).padStart(2, '0')

export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export function fromIso(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
export const hhmm = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`

// "YYYY-MM-DDTHH:MM" <-> Date, in local time.
export const isoDateTime = (d: Date) => `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
export function fromIsoDateTime(s: string) {
  const [date, time = '00:00'] = s.split('T')
  const d = fromIso(date)
  d.setMinutes(minutesOf(time))
  return d
}

// Date of an appointment start.
export function appointmentStart(a: { date: string; start: number }) {
  const d = fromIso(a.date)
  d.setMinutes(a.start)
  return d
}
