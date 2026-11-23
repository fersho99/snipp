// Free-slot rules for the booking flow (demo implementation of what the API
// will return), on the data shared with the web panel:
// - Dates go from today up to two months ahead, never further (RN-02).
// - Only slots inside the professional's work schedule, outside their
//   blocks (breaks, vacations, RF-W15) and not overlapping their other
//   appointments, booked in the app or in the panel (RN-01).
// - Today, only slots that have not started yet.
import { fromIsoDateTime, iso, minutesOf } from '@shared/dates';
import { employees as sharedEmployees, services as sharedServices } from '@shared/seed';
import { getData } from '@shared/store';
import { DEMO_TODAY } from './demo';
import { longDate, time } from '../theme/format';
import type { Branch } from '../types/domain';

export interface Slot { start: number; employeeId: string }

const SLOT_STEP = 30; // minutes between possible start times

// Services each professional performs.
export const staffServices: Record<string, string[]> = Object.fromEntries(sharedEmployees.map((e) => [e.id, e.serviceIds]));

export const today = () => new Date(DEMO_TODAY.getFullYear(), DEMO_TODAY.getMonth(), DEMO_TODAY.getDate());

export function lastBookableDate() {
  const t = today();
  return new Date(t.getFullYear(), t.getMonth() + 2, t.getDate());
}

export { fromIso, hhmm, iso } from '@shared/dates';
export const fromHhmm = minutesOf;

export const minutesLabel = (m: number) => time(new Date(2025, 0, 1, Math.floor(m / 60), m % 60));

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && a1 > b0;

// Blocks of the professional that touch this date, as [start, end] minutes
// of that day (a vacation covers the whole day).
function blocksOn(employeeId: string, date: Date) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
  return getData()
    .blocks.filter((b) => b.employeeId === employeeId)
    .map((b) => ({ reason: b.reason, from: fromIsoDateTime(b.from), to: fromIsoDateTime(b.to) }))
    .filter((b) => b.from < dayEnd && b.to > dayStart)
    .map((b) => ({
      reason: b.reason,
      start: Math.max(0, (b.from.getTime() - dayStart.getTime()) / 60000),
      end: Math.min(24 * 60, (b.to.getTime() - dayStart.getTime()) / 60000),
    }));
}

// Work hours of the professional that day, in minutes, or null on a day off.
function workHours(employeeId: string, date: Date): [number, number] | null {
  const h = sharedEmployees.find((e) => e.id === employeeId)?.schedule[date.getDay()];
  return h ? [minutesOf(h[0]), minutesOf(h[1])] : null;
}

const isDayOff = (employeeId: string, date: Date) => {
  const hours = workHours(employeeId, date);
  return !hours || blocksOn(employeeId, date).some((b) => b.start <= hours[0] && b.end >= hours[1]);
};

// Free start times (minutes) for one professional on one date.
// `ignoreFolio`: when rescheduling, the appointment being moved does not block itself.
export function freeSlotsFor(branch: Branch, employeeId: string, date: Date, durationMinutes: number, ignoreFolio?: string) {
  const hours = workHours(employeeId, date);
  if (!branch.hours[date.getDay()] || !hours) return [];
  const [open, close] = hours;
  const day = iso(date);
  const booked = getData()
    .appointments.filter((a) => a.employeeId === employeeId && a.date === day && a.folio !== ignoreFolio && (a.status === 'confirmada' || a.status === 'cambio'))
    .map((a) => [a.start, a.start + (sharedServices.find((s) => s.id === a.serviceId)?.minutes ?? 45)]);
  const blocks = blocksOn(employeeId, date);
  const isToday = day === iso(today());
  const nowMin = DEMO_TODAY.getHours() * 60 + DEMO_TODAY.getMinutes();

  const slots: number[] = [];
  for (let s = open; s + durationMinutes <= close; s += SLOT_STEP) {
    const e = s + durationMinutes;
    if (isToday && s <= nowMin) continue;
    if (blocks.some((b) => overlaps(s, e, b.start, b.end))) continue;
    if (booked.some(([b0, b1]) => overlaps(s, e, b0, b1))) continue;
    slots.push(s);
  }
  return slots;
}

// Professionals at this branch who perform the service.
export function staffFor(branch: Branch, serviceId: string) {
  return branch.staff.filter((e) => staffServices[e.id]?.includes(serviceId));
}

// Slots for the chosen professional (RF-M06); each slot carries who attends it.
export function slotsFor(branch: Branch, employeeId: string | null | undefined, serviceId: string, date: Date, durationMinutes: number, ignoreFolio?: string): Slot[] {
  const candidates = branch.staff.filter((e) => e.id === employeeId && staffServices[e.id]?.includes(serviceId));
  const byStart = new Map<number, string>();
  candidates.forEach((e) => {
    freeSlotsFor(branch, e.id, date, durationMinutes, ignoreFolio).forEach((s) => {
      if (!byStart.has(s)) byStart.set(s, e.id);
    });
  });
  return [...byStart.entries()].sort((a, b) => a[0] - b[0]).map(([start, id]) => ({ start, employeeId: id }));
}

export type DayStatus = 'past' | 'out' | 'closed' | 'off' | 'open' | 'full';
export function dayStatus(branch: Branch, employeeId: string | null | undefined, serviceId: string, date: Date, durationMinutes: number, ignoreFolio?: string): DayStatus {
  if (date < today()) return 'past';
  if (date > lastBookableDate()) return 'out';
  if (!branch.hours[date.getDay()]) return 'closed';
  if (employeeId && isDayOff(employeeId, date)) return 'off';
  return slotsFor(branch, employeeId, serviceId, date, durationMinutes, ignoreFolio).length ? 'open' : 'full';
}

// Human explanation of what was removed from the grid.
export function blocksNote(employeeId: string | null | undefined, date: Date) {
  // A whole day off is not offered at all, so there is nothing to explain.
  if (!employeeId || isDayOff(employeeId, date)) return null;
  const b = blocksOn(employeeId, date)[0];
  return b ? `${b.reason.toLowerCase()} de ${minutesLabel(b.start)} a ${minutesLabel(b.end)}` : null;
}

export function groupSlots<T extends Slot>(slots: T[]) {
  return [
    { id: 'manana', label: 'Mañana', items: slots.filter((s) => s.start < 12 * 60) },
    { id: 'tarde', label: 'Tarde', items: slots.filter((s) => s.start >= 12 * 60 && s.start < 18 * 60) },
    { id: 'noche', label: 'Noche', items: slots.filter((s) => s.start >= 18 * 60) },
  ].filter((g) => g.items.length);
}

export const dateLabel = (date: Date) => longDate(date);
