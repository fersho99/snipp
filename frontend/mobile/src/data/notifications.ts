// Notifications the client received (RF-M16), from the database shared with
// the web panel (frontend/shared/notifications.ts). In production each one
// arrives as a OneSignal push (see services/notifications.ts) and the API
// keeps the list. Here an action in the app adds its notification, and so
// does a change the branch makes in the panel: a changed or cancelled
// appointment, an order ready or cancelled, a report followed up.
import { useSyncExternalStore } from 'react';
import { sessionAccount } from '@shared/auth';
import { fromIso, fromIsoDateTime, iso } from '@shared/dates';
import * as shared from '@shared/notifications';
import { getData, subscribe } from '@shared/store';
import type { ClientNotification, DemoData } from '@shared/types';
import { DEMO_TODAY, client } from './demo';
import { longDate, time } from '../theme/format';
import type { AppNotification } from '../types/domain';

// day: hoy | ayer | antes (how the list groups them); when: the time, or the
// whole date for older ones.
const yesterday = iso(new Date(DEMO_TODAY.getFullYear(), DEMO_TODAY.getMonth(), DEMO_TODAY.getDate() - 1));
const cards = new WeakMap<ClientNotification, AppNotification>();
function toApp(n: ClientNotification): AppNotification {
  let out = cards.get(n);
  if (!out) {
    const at = fromIsoDateTime(n.at);
    const date = n.at.slice(0, 10);
    const day = date === iso(DEMO_TODAY) ? 'hoy' : date === yesterday ? 'ayer' : 'antes';
    out = { id: n.id, kind: n.kind, day, when: day === 'antes' ? `${longDate(fromIso(date))}, ${time(at)}` : time(at), read: n.read, route: n.route, title: n.title, body: n.body };
    cards.set(n, out);
  }
  return out;
}

let cache: { data: DemoData; email: string; list: AppNotification[] } | null = null;
function snapshot(): AppNotification[] {
  const data = getData();
  if (!cache || cache.data !== data || cache.email !== client.email) {
    cache = { data, email: client.email, list: shared.notificationsOf(data, client.email).map(toApp) };
  }
  return cache.list;
}

// The list belongs to the signed-in client, so there is nothing to load
// when the client changes. Kept for data/session.ts.
export function loadClientNotifications(_withSamples: boolean) {}

export const notificationStore = {
  subscribe,
  getSnapshot: snapshot,
  // What the API would send right after an action in the app.
  push({ kind, title, body, route }: Pick<AppNotification, 'kind' | 'title' | 'body' | 'route'>) {
    shared.notify(sessionAccount('app'), kind, title, body, route);
  },
  markRead(id: string) {
    shared.markNotificationRead(id, sessionAccount('app'));
  },
};

export function useNotifications() {
  return useSyncExternalStore(notificationStore.subscribe, notificationStore.getSnapshot, notificationStore.getSnapshot);
}
