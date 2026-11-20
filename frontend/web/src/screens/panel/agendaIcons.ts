// How each appointment status looks in the agenda (SRS v1.2, 4.2.2 "Agenda
// del día"): a white block with the 5 px stripe of its color and a label
// with icon and text. Green «Confirmada»; amber «Cambio sin respuesta»; red
// «Cancelada», «No asistió» or «Empleado no se presentó»; gray «Atendida».
import type { Status } from '../../components/status'
import { STRIPE } from '../../components/status'
import type { AppointmentStatus } from '../../types/domain'
import { STATUS } from '../../services/agenda'

const LOOK: Record<AppointmentStatus, Pick<Status, 'color' | 'icon'>> = {
  confirmada: { color: 'verde', icon: 'check' },
  cambio: { color: 'ambar', icon: 'atencion' },
  cancelada: { color: 'rojo', icon: 'cancelada' },
  'no-asistio': { color: 'rojo', icon: 'atencion' },
  'empleado-no-se-presento': { color: 'rojo', icon: 'atencion' },
  atendida: { color: 'gris', icon: 'check' },
}

export const apptStatus = (status: AppointmentStatus): Status => ({ label: STATUS[status], ...LOOK[status] })

// Block in the day grid and row in the week list.
export const blockClass = (status: AppointmentStatus) =>
  `border border-divider bg-raised text-ink hover:bg-gris-soft ${STRIPE[LOOK[status].color]}`

// Blocked hours: gray stripes plus the reason (SRS v1.2, 4.1 and 4.2.2).
export const BLOCKED_STYLE = { backgroundImage: 'repeating-linear-gradient(135deg, #F1F3F4 0 6px, #E3E3E3 6px 12px)' }
