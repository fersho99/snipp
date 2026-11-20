// Status colors of SRS v1.2, section 4.1. A card or agenda block shows its
// status in two places only: a 5 px stripe on the left edge and a label with
// icon and text; the rest stays white. Color is never the only signal (RN-19).
import { ArrowsClockwise, CheckCircle, Clock, Info, PauseCircle, ShoppingBag, WarningCircle, XCircle, type Icon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

// verde: confirmed or paid · ambar: changed or needs attention · rojo:
// cancelled or a problem · azul: ready or informative · gris: finished,
// current or inactive.
export type StatusColor = 'verde' | 'ambar' | 'rojo' | 'azul' | 'gris'

// check: confirmed, paid, attended, delivered · reagendada: circular arrows
// · atencion: needs attention or a problem · cancelada: cross · reloj: expiry
// · bolsa: ready for pickup · info: informative notice · pausa: inactive.
export type StatusIcon = 'check' | 'reagendada' | 'atencion' | 'cancelada' | 'reloj' | 'bolsa' | 'info' | 'pausa'

export interface Status {
  label: string
  color: StatusColor
  icon: StatusIcon
}

export const STATUS_ICONS: Record<StatusIcon, Icon> = {
  check: CheckCircle,
  reagendada: ArrowsClockwise,
  atencion: WarningCircle,
  cancelada: XCircle,
  reloj: Clock,
  bolsa: ShoppingBag,
  info: Info,
  pausa: PauseCircle,
}

// Full class names so Tailwind finds them.
export const STRIPE: Record<StatusColor, string> = {
  verde: 'border-l-[5px] border-l-verde',
  ambar: 'border-l-[5px] border-l-ambar',
  rojo: 'border-l-[5px] border-l-rojo',
  azul: 'border-l-[5px] border-l-azul',
  gris: 'border-l-[5px] border-l-gris',
}

export const TAG: Record<StatusColor, string> = {
  verde: 'bg-verde-soft text-verde-text',
  ambar: 'bg-ambar-soft text-ambar-text',
  rojo: 'bg-rojo-soft text-rojo-text',
  azul: 'bg-azul-soft text-azul-text',
  gris: 'bg-gris-soft text-gris-text',
}

// Counter next to a menu section: new reports in red, orders to prepare in gray.
export const COUNTER: Record<'rojo' | 'gris', string> = {
  rojo: 'bg-rojo-soft text-rojo-text',
  gris: 'bg-gris-soft text-gris-text',
}

// Label with the light fill of its color, its icon and the text.
export function StatusTag({ status, compact, className = '' }: { status: Status; compact?: boolean; className?: string }) {
  const Icon = STATUS_ICONS[status.icon]
  return (
    <span className={`inline-flex max-w-full items-center gap-1 rounded-md font-semibold ${compact ? 'px-1.5 py-px text-xs' : 'px-2 py-0.5 text-sm'} ${TAG[status.color]} ${className}`}>
      <Icon size={compact ? 13 : 16} weight={status.icon === 'reagendada' ? 'bold' : 'fill'} className="shrink-0" aria-hidden="true" />
      <span className={compact ? 'truncate' : ''}>{status.label}</span>
    </span>
  )
}

// Notice band (SRS v1.2, 4.1 "Avisos en pantalla"): light fill of its color
// plus the stripe; the icon and text use the dark tone.
export const NOTICE: Record<StatusColor, string> = {
  verde: 'bg-verde-soft border-l-[5px] border-l-verde',
  ambar: 'bg-ambar-soft border-l-[5px] border-l-ambar',
  rojo: 'bg-rojo-soft border-l-[5px] border-l-rojo',
  azul: 'bg-azul-soft border-l-[5px] border-l-azul',
  gris: 'bg-gris-soft border-l-[5px] border-l-gris',
}
export const NOTICE_ICON: Record<StatusColor, string> = {
  verde: 'text-verde-text',
  ambar: 'text-ambar-text',
  rojo: 'text-rojo-text',
  azul: 'text-azul-text',
  gris: 'text-gris-text',
}

// White card with the stripe of its status color.
export function StatusCard({ color, children, className = '' }: { color: StatusColor; children: ReactNode; className?: string }) {
  return <div className={`rounded-control border border-divider bg-raised ${STRIPE[color]} ${className}`}>{children}</div>
}
