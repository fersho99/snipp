'use client'

import type { Business } from '../types/domain'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigate } from '@/lib/navigation'
import { Button, Logo, Note, Skeleton } from '../components/ui'
import { currentSession, markOverdueSeen, networkMessage, type ApiError } from '../services/auth'
import { loadPanel, subscriptionStatus } from '../services/panel'
import { longDate } from '../theme'

// RF-W26 / RN-13: shown at sign-in to the Jefe and to every Empleado of a
// business whose free month or subscription ended without payment.
// Existing appointments are kept, so they can still enter the panel.
export default function OverduePayment() {
  const router = useRouter()
  const session = currentSession()
  const [data, setData] = useState<{ business: Business | null } | null>(null)
  const [failure, setFailure] = useState<ApiError | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!session) return
    loadPanel(session).then(setData).catch(setFailure)
  }, [session, attempt])

  if (!session) return <Navigate to="/entrar" replace />

  const business = data?.business
  if (data && (!business || subscriptionStatus(business.subscription).status !== 'vencida')) return <Navigate to="/panel" replace />

  const enter = (to: string) => {
    markOverdueSeen()
    router.replace(to)
  }
  const isJefe = session.role === 'jefe'

  return (
    <div className="min-h-dvh px-4 py-6 sm:px-10">
      <Logo />
      <main className="mx-auto mt-16 max-w-xl sm:mt-24">
        {failure ? (
          <Note title={networkMessage(failure).title} action={<Button variant="secondary" className="mt-3 self-start" onClick={() => { setFailure(null); setAttempt((n) => n + 1) }}>Reintentar</Button>}>
            No pudimos revisar el estado de la suscripción.
          </Note>
        ) : !business ? (
          <div className="flex flex-col gap-4" aria-busy="true" aria-label="Revisando la suscripción">
            <Skeleton className="h-9 w-80" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <>
            <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">
              {isJefe ? 'El pago de tu suscripción está pendiente' : `El pago de la suscripción de ${business.name} está pendiente`}
            </h1>
            <p className="mt-4 text-[17px]">
              {business.subscription.kind === 'prueba' ? 'El mes de prueba gratuita terminó' : 'La suscripción venció'} el {longDate(business.subscription.endsOn)}.
              Mientras no se pague, {business.name} y sus sucursales no se muestran en la app y no reciben reservas nuevas.
            </p>
            <p className="mt-3 text-ink-soft">
              {isJefe
                ? 'Las citas ya agendadas se respetan y los datos de tu negocio siguen guardados. Al pagar, tu negocio vuelve a aparecer en la app automáticamente.'
                : 'Tus citas ya agendadas se respetan. Tu Jefe es quien paga la suscripción; cuando lo haga, el negocio vuelve a aparecer en la app automáticamente.'}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {isJefe ? <Button onClick={() => enter('/panel/suscripcion')}>Pagar suscripción</Button> : null}
              <Button variant={isJefe ? 'secondary' : 'primary'} onClick={() => enter('/panel')}>Entrar al panel</Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
