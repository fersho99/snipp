// How each appointment status looks in the agenda. Traffic light asked by
// the client after the approval (17/11/2026): green = confirmed, orange =
// waiting for the client's answer, red = cancelled. Finished appointments
// (attended or no-shows) stay gray. A status never depends on color alone:
// each one has its icon and its text, and the pending one a dashed edge.
import { CheckCircle, Clock, Prohibit, UserMinus, XCircle, type Icon } from '@phosphor-icons/react'
import type { AppointmentStatus } from '../../types/domain'

export const STATUS_ICON: Record<AppointmentStatus, Icon> = {
  confirmada: CheckCircle,
  cambio: Clock,
  atendida: CheckCircle,
  'no-asistio': UserMinus,
  'empleado-no-se-presento': XCircle,
  cancelada: Prohibit,
}

export type Light = 'verde' | 'naranja' | 'rojo' | 'gris'
export const LIGHT: Record<AppointmentStatus, Light> = {
  confirmada: 'verde',
  cambio: 'naranja',
  cancelada: 'rojo',
  atendida: 'gris',
  'no-asistio': 'gris',
  'empleado-no-se-presento': 'gris',
}

// Block in the day grid and row in the week list.
export const BLOCK_CLASS: Record<Light, string> = {
  verde: 'border-l-[3px] border-success bg-success-soft text-ink hover:brightness-95',
  naranja: 'border-l-[3px] border-dashed border-warning bg-warning-soft text-ink hover:brightness-95',
  rojo: 'border-l-[3px] border-danger bg-danger-soft text-ink hover:brightness-95',
  gris: 'bg-sunken text-ink-soft hover:bg-sunken-pressed',
}

// Small swatch for the legend.
export const SWATCH_CLASS: Record<Light, string> = {
  verde: 'border-l-[3px] border-success bg-success-soft',
  naranja: 'border-l-[3px] border-dashed border-warning bg-warning-soft',
  rojo: 'border-l-[3px] border-danger bg-danger-soft',
  gris: 'bg-sunken',
}

// Color of the status icon next to its text.
export const ICON_CLASS: Record<Light, string> = {
  verde: 'text-success',
  naranja: 'text-warning',
  rojo: 'text-danger',
  gris: 'text-ink-soft',
}
