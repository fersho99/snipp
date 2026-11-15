import { Link } from 'react-router'
import { WarningCircle } from '@phosphor-icons/react'
import { getPlans } from '../services/subscriptions'
import { longDate } from '../theme'

const left = (n) => (n === 0 ? 'Vence hoy.' : n === 1 ? 'Falta 1 día.' : `Faltan ${n} días.`)

// Notice at the top of every panel page.
// RF-W25: the Jefe sees it from 7 days before the free month or the paid
// period ends. RF-W26 / RN-13: once it ended without payment, the Jefe and
// every Empleado see that the business is hidden in the app.
export default function SubscriptionNotice({ role, business, status }) {
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
        title={title}
        body={`${left(status.daysLeft)} ${sub.kind === 'prueba' ? 'Paga tu suscripción' : 'Renuévala'} antes de esa fecha para que ${business.name} siga apareciendo en la app y recibiendo reservas.`}
        action={{ to: '/panel/suscripcion', label: sub.kind === 'prueba' ? 'Pagar suscripción' : 'Renovar suscripción' }}
      />
    )
  }

  return (
    <Banner
      title="El pago de la suscripción está pendiente"
      body={`${business.name} y sus sucursales no se muestran en la app ni reciben reservas nuevas. Las citas ya agendadas se respetan.${isJefe ? '' : ' Tu Jefe es quien paga la suscripción.'}`}
      action={isJefe ? { to: '/panel/suscripcion', label: 'Pagar suscripción' } : null}
    />
  )
}

function Banner({ title, body, action }) {
  return (
    <div className="mb-8 flex flex-col gap-3 rounded-control bg-sunken px-5 py-4 sm:flex-row sm:items-center sm:justify-between" role="status">
      <div className="flex gap-3">
        <WarningCircle size={22} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 text-sm">{body}</p>
        </div>
      </div>
      {action ? (
        <Link to={action.to} className="inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-control bg-ink px-4 text-[15px] font-semibold text-white hover:bg-ink-pressed sm:self-center">
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}
