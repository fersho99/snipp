// Andrea's appointments plus a tiny in-memory store, so cancelling,
// rescheduling or accepting a change shows up on every screen of the demo.
import { useSyncExternalStore } from 'react';
import { DEMO_TODAY, client, employees, services } from './demo';
import { addReview, getBranch } from './catalog';
import { fromIso, minutesLabel, setBookedProvider } from './availability';
import { longDate } from '../theme/format';

export const CANCEL_HOURS = 2; // branch setting, default 2 hours

// status: confirmada | cambio | cancelada-negocio | cancelada-cliente |
//         atendida | no-asistio | empleado-no-se-presento
const initial = [
  { folio: 'C-10482', serviceId: 'fade', employeeId: 'luis', branchId: 'los-compas-centro', date: '2026-11-19', start: 17 * 60 + 30, status: 'confirmada' },
  {
    folio: 'C-10486', serviceId: 'corte-clasico', employeeId: 'oscar', branchId: 'los-compas-norte', date: '2026-11-21', start: 12 * 60, status: 'cancelada-negocio',
    businessNote: 'Óscar no va a estar en la sucursal ese día. Disculpa el cambio.', changedAt: 'ayer a las 7:40 pm',
  },
  {
    folio: 'C-10490', serviceId: 'corte-clasico', employeeId: 'luis', branchId: 'los-compas-centro', date: '2026-11-24', start: 18 * 60, status: 'cambio',
    change: { employeeId: 'ramon', date: null, start: null, note: 'Luis no va a estar esa tarde. Ramón te atiende con el mismo corte.', at: 'hoy a las 9:12 am' },
  },
  { folio: 'C-10497', serviceId: 'unas', employeeId: 'fernanda', branchId: 'estudio-marisol', date: '2026-11-28', start: 11 * 60, status: 'confirmada' },

  { folio: 'C-10431', serviceId: 'fade', employeeId: 'luis', branchId: 'los-compas-centro', date: '2026-10-31', start: 17 * 60, status: 'atendida', review: null, report: null },
  { folio: 'C-10402', serviceId: 'corte-clasico', employeeId: 'ramon', branchId: 'los-compas-centro', date: '2026-10-17', start: 12 * 60, status: 'atendida', review: { stars: 5, text: 'Ramón trabaja con mucha calma.' }, report: null },
  { folio: 'C-10388', serviceId: 'unas', employeeId: 'fernanda', branchId: 'estudio-marisol', date: '2026-10-10', start: 11 * 60, status: 'no-asistio' },
  {
    folio: 'C-10370', serviceId: 'fade', employeeId: 'luis', branchId: 'los-compas-centro', date: '2026-10-03', start: 18 * 60, status: 'empleado-no-se-presento',
    report: { sentOn: '3 de octubre', state: 'en revisión', reason: 'puntualidad', text: 'Llegué a las 6:00 pm y Luis no estaba. Esperé 25 minutos y nadie me avisó que no iba a venir.' },
  },
  { folio: 'C-10355', serviceId: 'tinte', employeeId: 'karla', branchId: 'estudio-marisol', date: '2026-09-26', start: 10 * 60, status: 'cancelada-cliente' },
  {
    folio: 'C-10318', serviceId: 'corte-barba', employeeId: 'ramon', branchId: 'los-compas-centro', date: '2026-09-12', start: 16 * 60, status: 'atendida',
    review: { stars: 3, text: 'La barba quedó bien definida, pero la capa tenía cabello del cliente anterior.' },
    report: { sentOn: '12 de septiembre', state: 'atendido', reason: 'higiene', text: 'La capa que me pusieron tenía cabello del cliente anterior y Ramón no la cambió cuando se lo dije.' },
  },
];

let state = initial.map((a) => ({ ...a }));
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export const appointmentStore = {
  subscribe(l) { listeners.add(l); return () => listeners.delete(l); },
  getSnapshot() { return state; },
  update(folio, patch) {
    state = state.map((a) => (a.folio === folio ? { ...a, ...patch } : a));
    emit();
  },
  // New booking from the app; returns its folio.
  add(appt) {
    const folio = `C-${nextFolio}`;
    nextFolio += 1;
    state = [{ folio, ...appt }, ...state];
    emit();
    return folio;
  },
};
let nextFolio = 10501;

// Booked appointments block their slot; cancelled ones free it (RF-M06, RF-M07, RN-01).
setBookedProvider(() =>
  state
    .filter((a) => a.status === 'confirmada' || a.status === 'cambio')
    .map((a) => ({ folio: a.folio, employeeId: a.employeeId, date: a.date, start: a.start, end: a.start + services.find((s) => s.id === a.serviceId).minutes })),
);

export function useAppointments() {
  return useSyncExternalStore(appointmentStore.subscribe, appointmentStore.getSnapshot, appointmentStore.getSnapshot);
}

export function useAppointment(folio) {
  return useAppointments().find((a) => a.folio === folio);
}

// ---------------------------------------------------------------- helpers
export const startDate = (a) => {
  const d = fromIso(a.date);
  d.setHours(Math.floor(a.start / 60), a.start % 60, 0, 0);
  return d;
};

export const isUpcoming = (a, now = DEMO_TODAY) => ['confirmada', 'cambio', 'cancelada-negocio'].includes(a.status) && startDate(a) > now;

export function describe(a) {
  const service = services.find((s) => s.id === a.serviceId);
  const employee = employees.find((e) => e.id === a.employeeId);
  const branch = getBranch(a.branchId);
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
export function changeWindow(a, now = DEMO_TODAY) {
  const start = startDate(a);
  const deadline = new Date(start.getTime() - CANCEL_HOURS * 3600 * 1000);
  return {
    allowed: now < deadline,
    deadline,
    deadlineLabel: `${longDate(deadline)} a las ${minutesLabel(deadline.getHours() * 60 + deadline.getMinutes())}`,
    minutesLeft: Math.max(0, Math.round((start - now) / 60000)),
  };
}

// For the "less than 2 hours" demo state: the clock as if it were
// Thursday 19 November at 4:15 pm, 75 minutes before C-10482.
export const NOW_NEAR_C10482 = new Date(2026, 10, 19, 16, 15);

// Status text and tone (the tone picks the icon in StatusLine).
export function statusOf(a) {
  const d = describe(a);
  const who = d.employee?.name.split(' ')[0];
  switch (a.status) {
    case 'confirmada': return { label: 'Confirmada', tone: 'done' };
    case 'cambio': return { label: `${d.branch.name} cambió tu cita, falta tu respuesta`, tone: 'pending' };
    case 'cancelada-negocio': return { label: `Cancelada por ${d.branch.name}`, tone: 'stopped' };
    case 'cancelada-cliente': return { label: 'La cancelaste', tone: 'soft' };
    case 'atendida': return { label: 'Atendida', tone: 'done' };
    case 'no-asistio': return { label: 'No asististe', tone: 'soft' };
    case 'empleado-no-se-presento': return { label: `${who} no se presentó`, tone: 'stopped' };
    default: return { label: a.status, tone: 'soft' };
  }
}

// What the client may still do with a past appointment.
// RN-08: one review per attended appointment.
// RN-15: one report per appointment, only if attended or "Empleado no se presentó".
export const canReview = (a) => a.status === 'atendida' && !a.review;
export const canReport = (a) => ['atendida', 'empleado-no-se-presento'].includes(a.status) && !a.report;

export const TODAY_LABEL = '12 de noviembre';

// RF-M12: the review is published on the business page and counts in its average.
export function submitReview(folio, { stars, text }) {
  const a = state.find((x) => x.folio === folio);
  const d = describe(a);
  appointmentStore.update(folio, { review: { stars, text } });
  return addReview(a.branchId, {
    id: `r-${folio}`,
    author: client.name,
    stars,
    date: TODAY_LABEL,
    service: `${d.service.name} con ${d.employee.name}`,
    text,
  });
}

// RF-M13: reasons listed in the SRS.
export const REPORT_REASONS = [
  { id: 'trato', label: 'Trato' },
  { id: 'puntualidad', label: 'Puntualidad' },
  { id: 'higiene', label: 'Higiene' },
  { id: 'calidad', label: 'Calidad del servicio' },
  { id: 'otro', label: 'Otro' },
];
export const reasonLabel = (id) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

// RF-M13: goes to the Jefe of that business; the employee never sees it (RN-15).
export function submitReport(folio, { reason, text }) {
  appointmentStore.update(folio, { report: { sentOn: TODAY_LABEL, state: 'enviado', reason, text } });
}

// RF-M14: enviado | en revisión | atendido (the Jefe changes it on the web).
export function reportStatusOf(report) {
  switch (report.state) {
    case 'enviado': return { label: 'Enviado', tone: 'pending' };
    case 'en revisión': return { label: 'En revisión', tone: 'pending' };
    case 'atendido': return { label: 'Atendido', tone: 'done' };
    default: return { label: report.state, tone: 'soft' };
  }
}
