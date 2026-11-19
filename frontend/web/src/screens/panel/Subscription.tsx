'use client'

import type { Business, Plan } from '../../types/domain'
import type { PaymentResult } from '../../services/subscriptions'
import { useState } from 'react'
import { useBusinessPanel } from '@/components/PanelContext'
import { Circle, LockSimple, RadioButton } from '@phosphor-icons/react'
import { Button, Dialog, Note } from '../../components/ui'
import { STRIPE, StatusTag, type Status } from '../../components/status'
import { networkMessage, type ApiError } from '../../services/auth'
import { subscriptionStatus } from '../../services/panel'
import { paySubscription, useSubscriptionsStore } from '../../services/subscriptions'
import { addMonths, longDate, money } from '../../theme'
import { DEMO_TODAY } from '../../data/demo'

const duration = (m: number) => (m === 1 ? 'cada mes' : m === 12 ? 'cada año' : `cada ${m} meses`)

// Suscripción, for the Jefe (RF-W25, RN-13): see the plan and when it
// ends, and pay or renew with Stripe. Paying moves the expiry date; an
// overdue business shows up again in the app right after paying.
export default function Subscription() {
  const { business } = useBusinessPanel()
  const s = useSubscriptionsStore()
  const record = s.businesses.find((b) => b.id === business.id)
  const sub = record?.subscription ?? business.subscription
  const status = subscriptionStatus(sub)
  const plans = s.plans.filter((p) => p.offered || p.id === sub.planId)
  const current = s.plans.find((p) => p.id === sub.planId)
  const [planId, setPlanId] = useState(current?.offered ? current.id : plans[0]?.id)
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState<(PaymentResult & { wasOverdue: boolean }) | null>(null)
  const plan = s.plans.find((p) => p.id === planId)
  const from = sub.endsOn < DEMO_TODAY ? DEMO_TODAY : sub.endsOn
  const overdue = status.status === 'vencida'
  // SRS v1.2, 4.1: active green, expiring (7 days or less) amber, expired red.
  const subStatus: Status = overdue
    ? { label: 'Vencida', color: 'rojo', icon: 'atencion' }
    : status.status === 'por-vencer'
      ? { label: 'Por vencer', color: 'ambar', icon: 'reloj' }
      : { label: 'Activa', color: 'verde', icon: 'check' }

  return (
    <div className="max-w-3xl">
      <h1 className="text-[28px] font-bold leading-tight">Suscripción</h1>
      <p className="mt-1 text-ink-soft">{business.name}</p>

      {paid ? (
        <div className="mt-6">
          <Note tone="done" title={`Pago recibido: ${money(paid.payment.amount)}`}>
            Tu suscripción queda pagada hasta el {longDate(paid.endsOn)}.{paid.wasOverdue ? ` ${business.name} ya aparece otra vez en la app y puede recibir reservas.` : ''}
          </Note>
        </div>
      ) : null}

      {/* Where it stands */}
      <section className={`mt-8 flex flex-col gap-2 rounded-control bg-raised p-5 ${STRIPE[subStatus.color]}`} aria-labelledby="estado-sub">
        <StatusTag status={subStatus} className="self-start" />
        <div>
          <h2 id="estado-sub" className="text-lg font-semibold">
            {overdue
              ? 'Pago pendiente'
              : sub.kind === 'prueba'
                ? 'Mes de prueba gratuita'
                : `Plan ${current?.name ?? ''}`}
          </h2>
          <p className="mt-1">
            {overdue
              ? `${sub.kind === 'prueba' ? 'Tu prueba gratuita terminó' : 'Tu suscripción venció'} el ${longDate(sub.endsOn)}. Tu negocio no se muestra en la app ni recibe reservas nuevas; las citas ya agendadas se respetan.`
              : sub.kind === 'prueba'
                ? `Termina el ${longDate(sub.endsOn)}. Paga antes para que tu negocio siga apareciendo en la app.`
                : `Pagada hasta el ${longDate(sub.endsOn)}${status.status === 'por-vencer' ? ` (${status.daysLeft === 0 ? 'vence hoy' : status.daysLeft === 1 ? 'falta 1 día' : `faltan ${status.daysLeft} días`})` : ''}.`}
          </p>
          <p className="mt-1 text-sm text-ink-soft">Te avisamos en el panel 7 días antes de que venza.</p>
        </div>
      </section>

      {/* Pay or renew */}
      <section className="mt-10" aria-labelledby="pagar">
        <h2 id="pagar" className="text-lg font-semibold">{overdue || sub.kind === 'prueba' ? 'Pagar suscripción' : 'Renovar'}</h2>
        {plans.length ? (
          <>
            <div role="radiogroup" aria-label="Plan" className="mt-4 flex flex-col gap-2">
              {plans.map((p) => {
                const on = p.id === planId
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPlanId(p.id)}
                    className={`flex min-h-14 items-center gap-3 rounded-control px-4 text-left transition-colors ${on ? 'bg-raised ring-2 ring-ink' : 'bg-sunken hover:bg-sunken-pressed'}`}
                  >
                    {on ? <RadioButton size={22} weight="fill" aria-hidden="true" /> : <Circle size={22} aria-hidden="true" />}
                    <span className="flex-1 font-semibold">{p.name}{p.id === sub.planId && sub.kind === 'pagada' ? ' · tu plan actual' : ''}</span>
                    <span className="tabular">{money(p.price)} {duration(p.months)}</span>
                  </button>
                )
              })}
            </div>
            {plan ? (
              <p className="mt-4">
                Al pagar, tu suscripción queda pagada hasta el <strong className="font-semibold">{longDate(addMonths(from, plan.months))}</strong>
                {overdue ? ', contando desde hoy.' : `, contando desde el ${longDate(from)}.`}
              </p>
            ) : null}
            <Button className="mt-5" onClick={() => { setPaying(true); setPaid(null) }} disabled={!plan}>
              Pagar {plan ? money(plan.price) : ''} con tarjeta
            </Button>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-soft">
              <LockSimple size={14} aria-hidden="true" />
              El pago lo procesa Stripe. SNIPP no guarda los datos de tu tarjeta, solo la referencia del pago.
            </p>
          </>
        ) : (
          <p className="mt-3 text-ink-soft">Por ahora no hay planes disponibles. El Administrador de SNIPP los publica; intenta más tarde.</p>
        )}
      </section>

      {/* Payment history */}
      <section className="mt-12" aria-labelledby="pagos">
        <h2 id="pagos" className="text-lg font-semibold">Pagos</h2>
        {record?.payments.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-divider text-sm text-ink-soft">
                  <th scope="col" className="py-2.5 pr-4 font-medium">Fecha</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Plan</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Monto</th>
                  <th scope="col" className="py-2.5 pl-3 font-medium">Referencia de Stripe</th>
                </tr>
              </thead>
              <tbody>
                {record.payments.map((p) => (
                  <tr key={p.id} className="border-b border-divider last:border-0">
                    <td className="py-2.5 pr-4">{longDate(p.on)}</td>
                    <td className="px-3 py-2.5">{s.plans.find((x) => x.id === p.planId)?.name}</td>
                    <td className="tabular px-3 py-2.5 text-right">{money(p.amount)}</td>
                    <td className="tabular py-2.5 pl-3 text-sm">{p.ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-ink-soft">Todavía no hay pagos.</p>
        )}
      </section>

      {paying && plan ? (
        <PayDialog
          business={business}
          plan={plan}
          onClose={() => setPaying(false)}
          onDone={(r) => { setPaying(false); setPaid({ ...r, wasOverdue: overdue }) }}
        />
      ) : null}
    </div>
  )
}

// Stand-in for Stripe's payment form: in production this step opens Stripe
// (Payment Element) and the card data never touches SNIPP.
function PayDialog({ business, plan, onClose, onDone }: { business: Business; plan: Plan; onClose: () => void; onDone: (r: PaymentResult) => void }) {
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<ApiError | null>(null)
  const pay = async () => {
    setBusy(true)
    setFailure(null)
    try {
      onDone(await paySubscription(business.id, plan.id))
    } catch (err) {
      setFailure(err as ApiError)
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Pagar plan ${plan.name}`}
      actions={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={pay} loading={busy}>Pagar {money(plan.price)}</Button></>}
    >
      <p>{money(plan.price)} {duration(plan.months)} para {business.name}.</p>
      <div className="rounded-control bg-sunken p-4 text-sm">
        <p className="font-semibold">Formulario de pago de Stripe</p>
        <p className="mt-1 text-ink-soft">Aquí aparece el formulario seguro de Stripe para la tarjeta. En la plantilla el pago se simula en modo de prueba.</p>
      </div>
      {failure ? (
        <Note title={failure.code === 'card' ? 'La tarjeta fue rechazada' : networkMessage(failure).title}>
          {failure.code === 'card' ? 'Stripe no aprobó el pago y no se cobró nada. Prueba con otra tarjeta.' : 'No se completó el pago y no se cobró nada. Intenta de nuevo.'}
        </Note>
      ) : null}
    </Dialog>
  )
}
