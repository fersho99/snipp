// Free-slot rules for the booking flow (demo implementation of what the API
// will return):
// - Dates go from today up to two months ahead, never further.
// - Only slots inside the branch hours, outside the professional's blocks
//   (breaks, vacations) and not overlapping their other appointments.
// - Today, only slots that have not started yet.
import { DEMO_TODAY } from './demo';
import { longDate, time } from '../theme/format';

const SLOT_STEP = 30; // minutes between possible start times
const BOOKED_LENGTH = 45; // typical length of an existing appointment

// Services each professional performs.
export const staffServices = {
  luis: ['corte-clasico', 'fade', 'barba', 'corte-barba'],
  ramon: ['corte-clasico', 'barba', 'corte-barba'],
  oscar: ['corte-clasico', 'fade', 'barba', 'corte-barba'],
  karla: ['tinte', 'mechas'],
  fernanda: ['unas'],
};

// Recurring breaks, in minutes from midnight.
const breaks = {
  luis: [[14 * 60, 15 * 60, 'descanso de 2:00 a 3:00 pm']],
  ramon: [[13 * 60, 14 * 60, 'descanso de 1:00 a 2:00 pm']],
  karla: [[14 * 60, 15 * 60, 'descanso de 2:00 a 3:00 pm']],
  fernanda: [[13 * 60, 14 * 60, 'descanso de 1:00 a 2:00 pm']],
};

// Vacations / one-off blocks: employee -> list of ISO dates.
const daysOff = {
  luis: ['2026-11-26', '2026-11-27'],
  ramon: ['2026-12-23'],
  oscar: ['2026-11-18', '2026-11-19', '2026-11-20'], // same vacation the web agenda shows
};

// Days the demo shows as fully booked for a professional.
const fullDays = { luis: ['2026-11-14', '2026-11-21'] };

// Appointments already booked in the system (set by data/appointments.js).
let bookedProvider = () => [];
export function setBookedProvider(fn) {
  bookedProvider = fn;
}

// Slots kept free on purpose so the sample appointments always fit.
const keepFree = { 'luis|2026-11-19': [15 * 60, 18 * 60 + 30] };

export const today = () => new Date(DEMO_TODAY.getFullYear(), DEMO_TODAY.getMonth(), DEMO_TODAY.getDate());

export function lastBookableDate() {
  const t = today();
  return new Date(t.getFullYear(), t.getMonth() + 2, t.getDate());
}

export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromIso = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const minutesLabel = (m) => time(new Date(2025, 0, 1, Math.floor(m / 60), m % 60));
export const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const fromHhmm = (s) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

// Small deterministic PRNG so the same day always shows the same bookings.
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bookedIntervals(employeeId, date, open, close) {
  const key = `${employeeId}|${iso(date)}`;
  const rand = seeded(key);
  const free = keepFree[key];
  const list = [];
  for (let s = open; s + BOOKED_LENGTH <= close; s += SLOT_STEP) {
    if (rand() < 0.38) {
      const interval = [s, s + BOOKED_LENGTH];
      if (free && interval[0] < free[1] && interval[1] > free[0]) continue;
      list.push(interval);
      s += SLOT_STEP; // existing appointments do not stack back to back
    }
  }
  return list;
}

const overlaps = (a0, a1, b0, b1) => a0 < b1 && a1 > b0;

// Free start times (minutes) for one professional on one date.
// `ignoreFolio`: when rescheduling, the appointment being moved does not block itself.
export function freeSlotsFor(branch, employeeId, date, durationMinutes, ignoreFolio) {
  const hours = branch.hours[date.getDay()];
  if (!hours) return [];
  if (daysOff[employeeId]?.includes(iso(date))) return [];
  if (fullDays[employeeId]?.includes(iso(date))) return [];
  const open = hours[0] * 60;
  const close = hours[1] * 60;
  const booked = [
    ...bookedIntervals(employeeId, date, open, close),
    ...bookedProvider().filter((b) => b.employeeId === employeeId && b.date === iso(date) && b.folio !== ignoreFolio).map((b) => [b.start, b.end]),
  ];
  const blocks = breaks[employeeId] ?? [];
  const isToday = iso(date) === iso(today());
  const nowMin = DEMO_TODAY.getHours() * 60 + DEMO_TODAY.getMinutes();

  const slots = [];
  for (let s = open; s + durationMinutes <= close; s += SLOT_STEP) {
    const e = s + durationMinutes;
    if (isToday && s <= nowMin) continue;
    if (blocks.some(([b0, b1]) => overlaps(s, e, b0, b1))) continue;
    if (booked.some(([b0, b1]) => overlaps(s, e, b0, b1))) continue;
    slots.push(s);
  }
  return slots;
}

// Professionals at this branch who perform the service.
export function staffFor(branch, serviceId) {
  return branch.staff.filter((e) => staffServices[e.id]?.includes(serviceId));
}

// Slots for the chosen professional (RF-M06); each slot carries who attends it.
export function slotsFor(branch, employeeId, serviceId, date, durationMinutes, ignoreFolio) {
  const candidates = branch.staff.filter((e) => e.id === employeeId && staffServices[e.id]?.includes(serviceId));
  const byStart = new Map();
  candidates.forEach((e) => {
    freeSlotsFor(branch, e.id, date, durationMinutes, ignoreFolio).forEach((s) => {
      if (!byStart.has(s)) byStart.set(s, e.id);
    });
  });
  return [...byStart.entries()].sort((a, b) => a[0] - b[0]).map(([start, id]) => ({ start, employeeId: id }));
}

export function dayStatus(branch, employeeId, serviceId, date, durationMinutes, ignoreFolio) {
  if (date < today()) return 'past';
  if (date > lastBookableDate()) return 'out';
  if (!branch.hours[date.getDay()]) return 'closed';
  if (employeeId && daysOff[employeeId]?.includes(iso(date))) return 'off';
  return slotsFor(branch, employeeId, serviceId, date, durationMinutes, ignoreFolio).length ? 'open' : 'full';
}

// Human explanation of what was removed from the grid.
export function blocksNote(employeeId, date) {
  if (!employeeId) return null;
  if (daysOff[employeeId]?.includes(iso(date))) return 'ese día está de vacaciones';
  return breaks[employeeId]?.[0]?.[2] ?? null;
}

export function groupSlots(slots) {
  return [
    { id: 'manana', label: 'Mañana', items: slots.filter((s) => s.start < 12 * 60) },
    { id: 'tarde', label: 'Tarde', items: slots.filter((s) => s.start >= 12 * 60 && s.start < 18 * 60) },
    { id: 'noche', label: 'Noche', items: slots.filter((s) => s.start >= 18 * 60) },
  ].filter((g) => g.items.length);
}

export const dateLabel = (date) => longDate(date);
