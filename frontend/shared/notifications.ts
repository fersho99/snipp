// Notifications for the client (RF-M16). In production the API sends each
// one as a OneSignal push and keeps the list; here the store adds them to
// the shared data when something happens on either side (effects.ts).
import { withNotification } from './effects'
import { ApiError, commit, getData } from './store'
import type { Account, DemoData, NotificationKind } from './types'

// What the app itself sends right after an action of the client (a booking,
// a cancellation, a payment): the API would send the same push.
export function notify(actor: Account | null, kind: NotificationKind, title: string, body: string, route: string) {
  if (!actor || actor.role !== 'cliente') return
  commit((d) => withNotification(d, actor.email, kind, title, body, route))
}

export const notificationsOf = (d: DemoData, clientEmail: string) => d.notifications.filter((n) => n.clientEmail === clientEmail)

export function markNotificationRead(id: string, actor: Account | null) {
  const n = getData().notifications.find((x) => x.id === id)
  if (!n) throw new ApiError('not-found', 'Esa notificación ya no existe.')
  if (!actor || actor.email !== n.clientEmail) throw new ApiError('forbidden', 'Esa notificación no es tuya.')
  commit((d) => ({ ...d, notifications: d.notifications.map((x) => (x.id === id ? { ...x, read: true } : x)) }))
}
