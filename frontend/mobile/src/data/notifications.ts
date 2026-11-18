// Notifications the client received (RF-M16). In production each one arrives
// as an OneSignal push (see services/notifications.ts) and the API keeps the
// list; here it is an in-memory store so booking, cancelling or rescheduling
// in the demo adds the matching notification.
import { useSyncExternalStore } from 'react';
import type { AppNotification } from '../types/domain';

// kind: confirmacion | recordatorio-24h | recordatorio-1h | cambio |
//       cancelacion | reagendada | pedido-listo
// day: hoy | ayer | antes (how the list groups them)
let state: AppNotification[] = [
  {
    id: 'n8', kind: 'cambio', day: 'hoy', when: '9:12 am', read: false, route: '/cambio/C-10490',
    title: 'Barbería Los Compas cambió tu cita del martes 24',
    body: 'Ramón Cázares te atiende a las 6:00 pm en lugar de Luis Ortega. Acepta el cambio, reagenda o cancela.',
  },
  {
    id: 'n7', kind: 'cancelacion', day: 'ayer', when: '7:40 pm', read: false, route: '/cita/C-10486',
    title: 'Los Compas Norte canceló tu cita del sábado 21',
    body: 'Tu corte clásico de las 12:00 pm con Óscar Félix. Puedes reservar otro horario.',
  },
  {
    id: 'n6', kind: 'pedido-listo', day: 'ayer', when: '11:30 am', read: true, route: '/pedido/P-2279',
    title: 'Tu pedido P-2279 está listo para recoger',
    body: 'Recógelo en Barbería Los Compas, Av. Obregón y Calle 5. Muestra el folio al llegar.',
  },
  {
    id: 'n5', kind: 'confirmacion', day: 'antes', when: 'lunes 9 de noviembre, 8:05 pm', read: true, route: '/cita/C-10497',
    title: 'Cita confirmada: uñas acrílicas el sábado 28',
    body: 'Con Fernanda Lugo en Estudio Marisol a las 11:00 am. Folio C-10497.',
  },
  {
    id: 'n4', kind: 'confirmacion', day: 'antes', when: 'sábado 7 de noviembre, 1:15 pm', read: true, route: '/cita/C-10482',
    title: 'Cita confirmada: fade el jueves 19',
    body: 'Con Luis Ortega en Barbería Los Compas a las 5:30 pm. Folio C-10482.',
  },
  {
    id: 'n3', kind: 'pedido-listo', day: 'antes', when: 'lunes 2 de noviembre, 1:02 pm', read: true, route: '/pedido/P-2264',
    title: 'Tu pedido P-2264 está listo para recoger',
    body: 'Recógelo en Barbería Los Compas, Av. Obregón y Calle 5. Muestra el folio al llegar.',
  },
  {
    id: 'n2', kind: 'recordatorio-1h', day: 'antes', when: 'sábado 31 de octubre, 4:00 pm', read: true, route: '/cita/C-10431',
    title: 'Tu cita es en 1 hora',
    body: 'Fade con Luis Ortega a las 5:00 pm en Barbería Los Compas.',
  },
  {
    id: 'n1', kind: 'recordatorio-24h', day: 'antes', when: 'viernes 30 de octubre, 5:00 pm', read: true, route: '/cita/C-10431',
    title: 'Mañana tienes cita a las 5:00 pm',
    body: 'Fade con Luis Ortega en Barbería Los Compas, Av. Obregón y Calle 5.',
  },
];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let nextId = 9;

export const notificationStore = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  getSnapshot() { return state; },
  // What the API would send right after an action in the app.
  push({ kind, title, body, route }: Pick<AppNotification, 'kind' | 'title' | 'body' | 'route'>) {
    state = [{ id: `n${nextId}`, kind, day: 'hoy', when: 'ahora', read: false, title, body, route }, ...state];
    nextId += 1;
    emit();
  },
  markRead(id: string) {
    state = state.map((n) => (n.id === id ? { ...n, read: true } : n));
    emit();
  },
};

export function useNotifications() {
  return useSyncExternalStore(notificationStore.subscribe, notificationStore.getSnapshot, notificationStore.getSnapshot);
}
