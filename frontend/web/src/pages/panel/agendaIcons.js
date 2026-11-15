// One icon per appointment status, so a status never depends on color alone.
import { CheckCircle, Clock, Prohibit, UserMinus, XCircle } from '@phosphor-icons/react'

export const STATUS_ICON = {
  confirmada: CheckCircle,
  cambio: Clock,
  atendida: CheckCircle,
  'no-asistio': UserMinus,
  'empleado-no-se-presento': XCircle,
  cancelada: Prohibit,
}
