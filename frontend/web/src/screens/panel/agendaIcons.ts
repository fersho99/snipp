// One icon per appointment status, so a status never depends on color alone.
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
