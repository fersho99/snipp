'use client'

import Link from 'next/link'
import { WarningCircle } from '@phosphor-icons/react'
import { getPlans } from '../services/subscriptions'
import { NOTICE, NOTICE_ICON, type StatusColor } from './status'
import { longDate } from '../theme'
import type { Business, Role, SubscriptionStatus } from '../types/domain'

const left = (n: number) => (n === 0 ? 'Vence hoy.' : n === 1 ? 'Falta 1 día.' : `Faltan ${n} días.`)

// Notice at the top of every panel page.
// RF-W25: the Jefe sees it from 7 days before the free month or the paid
// period ends. RF-W26 / RN-13: once it ended without payment, the Jefe and
// every Empleado see that the business is hidden in the app.
export default function SubscriptionNotice({ role, business, status }: { role: Role; business: Business; status: SubscriptionStatus | null }) {
  if (!status || status.status === 'al-dia') return null
  const sub = business.subscription
  const isJefe = role === 'jefe'

  if (status.status === 'por-vencer') {
    if (!isJefe) return null
    const plan = getPlans().find((p) => p.id === sub.planId)
    const title = sub.kind === 'prueba'
      ? `Tu mes de prueba gratuita termina el ${longDate(sub.endsOn)}`
      : `Tu suscripción${plan ? ` ${plan.name}` : ''} vence el ${longDate(sub.endsOn)}`
    return (
      <Banner
        tone="ambar"
        title={title}
        body={`${left(status.daysLeft)} ${sub.kind === 'prueba' ? 'Paga tu suscripción' : 'Renuévala'} antes de esa fecha para que ${business.name} siga apareciendo en la app y recibiendo reservas.`}
        action={{ to: '/panel/suscripcion', label: sub.kind === 'prueba' ? 'Pagar suscripción' : 'Renovar suscripción' }}
      />
    )
  }

  return (
    <Banner
      tone="rojo"
      title="El pago de la suscripción está pendiente"
      body={`${business.name} y sus sucursales no se muestran en la app ni reciben reservas nuevas. Las citas ya agendadas se respetan.${isJefe ? '' : ' Tu Jefe es quien paga la suscripción.'}`}
      action={isJefe ? { to: '/panel/suscripcion', label: 'Pagar suscripción' } : null}
    />
  )
}

// SRS v1.2, 4.2.2 "Avisos del negocio": amber band when it is about to
// expire, red once it expired.
function Banner({ tone, title, body, action }: { tone: StatusColor; title: string; body: string; action: { to: string; label: string } | null }) {
  return (
    <div className={`mb-8 flex flex-col gap-3 rounded-control px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${NOTICE[tone]}`} role="status">
      <div className="flex gap-3">
        <WarningCircle size={22} weight="fill" className={`mt-0.5 shrink-0 ${NOTICE_ICON[tone]}`} aria-hidden="true" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 text-sm">{body}</p>
        </div>
      </div>
      {action ? (
        <Link href={action.to} className="inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-control bg-ink px-4 text-[15px] font-semibold text-white hover:bg-ink-pressed sm:self-center">
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}
