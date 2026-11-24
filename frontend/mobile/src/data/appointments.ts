// The client's appointments, read from the database shared with the web
// panel (frontend/shared/store.ts): a booking made here shows up in the
// agenda of the branch, and a change made there shows up here.
import { useSyncExternalStore } from 'react';
import * as db from '@shared/store';
import { sessionAccount } from '@shared/auth';
import { CANCEL_HOURS } from '@shared/rules';
import type { Appointment as SharedAppointment, DemoData } from '@shared/types';
import { DEMO_TODAY, client, employees, services } from './demo';
import { getBranch } from './catalog';
import { fromIso, minutesLabel } from './availability';
import { longDate } from '../theme/format';
import type { Appointment, Report, ReportReason, StatusText } from '../types/domain';

// The demo data always points to existing records; a missing one is a bug.
function found<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Missing ${what}`);
  return value;
}

// RN-03: branch setting, default 2 hours (shared/rules.ts).
export { CANCEL_HOURS };

// A shared record as the app shows it. During a change the business proposed
// (RF-M08) the app shows what the client booked and the change apart.
const appAppointments = new WeakMap<SharedAppointment, Appointment>();
function toApp(a: SharedAppointment): Appointment {
  let out = appAppointments.get(a);
  if (out) return out;
  const before = a.status === 'cambio' ? a.previous : null;
  out = {
    folio: a.folio,
    serviceId: a.serviceId,
    employeeId: before?.employeeId ?? a.employeeId,
    branchId: a.branchId,
    date: before?.date ?? a.date,
    start: before?.start ?? a.start,
    status: a.status === 'cancelada' ? (a.cancelledBy === 'cliente' ? 'cancelada-cliente' : 'cancelada-negocio') : a.status,
    rescheduledFrom: a.rescheduledFrom,
    businessNote: a.note,
    changedAt: a.changedAt,
    change: before
      ? {
          employeeId: a.employeeId !== before.employeeId ? a.employeeId : null,
          date: a.date !== before.date ? a.date : null,
          start: a.start !== before.start ? a.start : null,
          note: a.note ?? '',
          at: a.changedAt ?? '',
        }
      : null,
    review: a.review,
    report: a.report,
  };
  appAppointments.set(a, out);
  return out;
}

// A change made in the app, in the shape of the shared record.
function toShared(patch: Partial<Appointment>): Partial<SharedAppointment> {
  const { status, change, businessNote, folio: _folio, ...rest } = patch;
  const out: Partial<SharedAppointment> = { ...rest };
  if (status === 'cancelada-cliente' || status === 'cancelada-negocio') {
    out.status = 'cancelada';
    out.cancelledBy = status === 'cancelada-cliente' ? 'cliente' : 'Jefe';
  } else if (status) out.status = status;
  if (change === null) out.previous = null;
  if (businessNote !== undefined) out.note = businessNote;
  return out;
}

let cache: { data: DemoData; email: string; list: Appointment[] } | null = null;
function snapshot(): Appointment[] {
  const data = db.getData();
  if (!cache || cache.data !== data || cache.email !== client.email) {
    cache = { data, email: client.email, list: data.appointments.filter((a) => a.clientEmail === client.email).map(toApp) };
  }
  return cache.list;
}

export const appointmentStore = {
  subscribe: db.subscribe,
  getSnapshot: snapshot,
  // The shared store checks the rules (RN-01 to RN-03, RN-08, RN-15) for the
  // signed-in client and throws an ApiError, changing nothing, if one is broken.
  update(folio: string, patch: Partial<Appointment>) {
    db.patchAppointment(folio, toShared(patch), sessionAccount('app'));
  },
  // The same check without saving, for screens that save after the success message.
  check(folio: string, patch: Partial<Appointment>) {
    db.checkAppointmentPatch(folio, toShared(patch), sessionAccount('app'));
  },
  // New booking from the app; returns its folio.
  add({ serviceId, employeeId, branchId, date, start }: Omit<Appointment, 'folio'>) {
    return db.insertAppointment({ serviceId, employeeId, branchId, date, start }, sessionAccount('app')).folio;
  },
};

export function useAppointments() {
  return useSyncExternalStore(appointmentStore.subscribe, appointmentStore.getSnapshot, appointmentStore.getSnapshot);
}

export function useAppointment(folio: string | undefined) {
  return useAppointments().find((a) => a.folio === folio);
}

// ---------------------------------------------------------------- helpers
export const startDate = (a: Pick<Appointment, 'date' | 'start'>) => {
  const d = fromIso(a.date);
  d.setHours(Math.floor(a.start / 60), a.start % 60, 0, 0);
  return d;
};

export const isUpcoming = (a: Appointment, now = DEMO_TODAY) => ['confirmada', 'cambio', 'cancelada-negocio'].includes(a.status) && startDate(a) > now;

export function describe(a: Pick<Appointment, 'serviceId' | 'employeeId' | 'branchId' | 'date' | 'start'>) {
  const service = found(services.find((s) => s.id === a.serviceId), a.serviceId);
  const employee = found(employees.find((e) => e.id === a.employeeId), a.employeeId);
  const branch = found(getBranch(a.branchId), a.branchId);
  const date = fromIso(a.date);
  return {
    service,
    employee,
    branch,
    date,
    dateLabel: longDate(date),
    timeLabel: minutesLabel(a.start),
    endLabel: minutesLabel(a.start + service.minutes),
  };
}

// Can the client still cancel / reschedule from the app?
export function changeWindow(a: Pick<Appointment, 'date' | 'start'> & { branchId?: string }, now = DEMO_TODAY) {
  const start = startDate(a);
  // RF-W08: each business sets how long before; 2 hours by default.
  const businessId = db.getData().branches.find((b) => b.id === a.branchId)?.businessId;
  const hours = db.getData().businesses.find((b) => b.id === businessId)?.minNoticeHours ?? CANCEL_HOURS;
  const deadline = new Date(start.getTime() - hours * 3600 * 1000);
  return {
    allowed: now < deadline,
    deadline,
    deadlineLabel: `${longDate(deadline)} a las ${minutesLabel(deadline.getHours() * 60 + deadline.getMinutes())}`,
    minutesLeft: Math.max(0, Math.round((start.getTime() - now.getTime()) / 60000)),
  };
}

// For the "less than 2 hours" demo state: the clock as if it were
// Thursday 19 November at 4:15 pm, 75 minutes before C-10482.
export const NOW_NEAR_C10482 = new Date(2026, 10, 19, 16, 15);

// Status text, color and icon (SRS v1.2, 4.1 and 4.2.1 "Mis citas").
export function statusOf(a: Appointment): StatusText {
  const d = describe(a);
  const who = d.employee?.name.split(' ')[0];
  switch (a.status) {
    case 'confirmada':
      return a.rescheduledFrom != null
        ? { label: `Reagendada · antes ${minutesLabel(a.rescheduledFrom)}`, color: 'ambar', icon: 'reagendada' }
        : { label: 'Confirmada', color: 'verde', icon: 'check' };
    case 'cambio': return { label: 'Cambió tu cita, falta tu respuesta', color: 'ambar', icon: 'atencion' };
    case 'cancelada-negocio': return { label: `Cancelada por ${d.branch.name}`, color: 'rojo', icon: 'cancelada' };
    case 'cancelada-cliente': return { label: 'Cancelada', color: 'rojo', icon: 'cancelada' };
    case 'atendida': return { label: 'Atendida', color: 'gris', icon: 'check' };
    case 'no-asistio': return { label: 'No asististe', color: 'rojo', icon: 'atencion' };
    case 'empleado-no-se-presento': return { label: `${who} no se presentó`, color: 'rojo', icon: 'atencion' };
    default: return { label: a.status, color: 'gris', icon: 'info' };
  }
}

// What the client may still do with a past appointment.
// RN-08: one review per attended appointment.
// RN-15: one report per appointment, only if attended or "Empleado no se presentó".
export const canReview = (a: Appointment) => a.status === 'atendida' && !a.review;
export const canReport = (a: Appointment) => ['atendida', 'empleado-no-se-presento'].includes(a.status) && !a.report;

export const TODAY_LABEL = '12 de noviembre';

// Checks a review or report with the shared store before the success
// message (RN-08, RN-15); throws an ApiError if it is not allowed.
export function checkReview(folio: string, review: { stars: number; text: string }) {
  appointmentStore.check(folio, { review: { stars: review.stars, text: review.text.trim() } });
}
export function checkReport(folio: string, report: { reason: string; text: string }) {
  appointmentStore.check(folio, { report: { sentOn: TODAY_LABEL, state: 'enviado', reason: report.reason, text: report.text.trim() } });
}

// RF-M12: the shared store publishes the review on the business page and in
// the Jefe's panel, and it counts in the average.
export function submitReview(folio: string, { stars, text }: { stars: number; text: string }) {
  appointmentStore.update(folio, { review: { stars, text: text.trim() } });
}

// RF-M13: reasons listed in the SRS.
export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'trato', label: 'Trato' },
  { id: 'puntualidad', label: 'Puntualidad' },
  { id: 'higiene', label: 'Higiene' },
  { id: 'calidad', label: 'Calidad del servicio' },
  { id: 'otro', label: 'Otro' },
];
export const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

// RF-M13: goes to the Jefe of that business; the employee never sees it (RN-15).
export function submitReport(folio: string, { reason, text }: { reason: string; text: string }) {
  appointmentStore.update(folio, { report: { sentOn: TODAY_LABEL, state: 'enviado', reason, text: text.trim() } });
}

// RF-M14: enviado (blue) | en revisión (amber) | atendido (green), SRS v1.2 4.1.
export function reportStatusOf(report: Report): StatusText {
  switch (report.state) {
    case 'enviado': return { label: 'Enviado', color: 'azul', icon: 'info' };
    case 'en revisión': return { label: 'En revisión', color: 'ambar', icon: 'atencion' };
    case 'atendido': return { label: 'Atendido', color: 'verde', icon: 'check' };
    default: return { label: report.state, color: 'gris', icon: 'info' };
  }
}
