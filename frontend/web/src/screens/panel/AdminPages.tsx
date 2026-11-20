'use client'

import type { Plan } from '../../types/domain'
import type { PlatformBusiness } from '../../services/subscriptions'
import type { Review, ReviewDecision, ReviewReport } from '../../services/reports'
type ReportedReview = Review & { reported: ReviewReport }
import { useState } from 'react'
import { Flag, PauseCircle, Plus, Star } from '@phosphor-icons/react'
import { Button, Checkbox, Dialog, Note, TextField } from '../../components/ui'
import { StatusTag, type Status } from '../../components/status'
import useAction from '@/lib/useAction'
import { subscriptionStatus } from '../../services/panel'
import { decideReview, useReportsStore } from '../../services/reports'
import { savePlan, setSuspended, useSubscriptionsStore } from '../../services/subscriptions'
import { longDate, money } from '../../theme'

const duration = (m: number) => (m === 1 ? '1 mes' : `${m} meses`)
const radio = (on: boolean) => `min-h-10 rounded-[8px] px-3.5 text-[15px] ${on ? 'bg-raised font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.08)]' : 'text-ink-soft hover:text-ink'}`

// ---------------------------------------------------------------- Planes
// RF-W27: name, price and duration. A plan created here is an option when a
// Jefe registers; one that is no longer offered stays for whoever has it.
export function Plans() {
  const { plans } = useSubscriptionsStore()
  const [editing, setEditing] = useState<Plan | 'nuevo' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  return (
    <div className="max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight">Planes</h1>
          <p className="mt-1 max-w-prose text-ink-soft">Los planes que se ofrecen se pueden elegir al registrar un negocio y al pagar la suscripción.</p>
        </div>
        <Button className="self-start sm:self-auto" onClick={() => { setEditing('nuevo'); setNotice(null) }}>
          <Plus size={18} weight="bold" aria-hidden="true" />
          Crear plan
        </Button>
      </div>
      {notice ? <div className="mt-6"><Note tone="done" title={notice} /></div> : null}
      {editing === 'nuevo' ? <PlanForm onCancel={() => setEditing(null)} onDone={(t) => { setEditing(null); setNotice(t) }} /> : null}
      {plans.length ? (
        <ul className="mt-6">
          {plans.map((p) =>
            editing !== 'nuevo' && editing?.id === p.id ? (
              <li key={p.id}><PlanForm plan={p} onCancel={() => setEditing(null)} onDone={(t) => { setEditing(null); setNotice(t) }} /></li>
            ) : (
              <li key={p.id} className="flex items-center justify-between gap-6 border-b border-divider py-4 last:border-0">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="tabular text-[15px]">{money(p.price)} por {duration(p.months)}</p>
                  {!p.offered ? <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold"><PauseCircle size={16} weight="fill" aria-hidden="true" />Ya no se ofrece</p> : null}
                </div>
                <button type="button" onClick={() => { setEditing(p); setNotice(null) }} className="min-h-11 font-medium underline underline-offset-4">Editar</button>
              </li>
            ),
          )}
        </ul>
      ) : (
        <div className="mt-8">
          <p className="font-semibold">Todavía no hay planes</p>
          <p className="mt-1">Sin planes publicados nadie puede registrar un negocio. Crea el primero.</p>
        </div>
      )}
    </div>
  )
}

function PlanForm({ plan, onCancel, onDone }: { plan?: Plan; onCancel: () => void; onDone: (text: string) => void }) {
  const [form, setForm] = useState({ name: plan?.name ?? '', price: plan ? String(plan.price) : '', months: plan ? String(plan.months) : '', offered: plan?.offered ?? true })
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({})
  const saving = useAction(plan
    ? { busy: 'Guardando...', done: 'Plan guardado', failed: 'No se pudo guardar' }
    : { busy: 'Creando...', done: 'Plan creado', failed: 'No se pudo crear' })
  const set = (k: 'name' | 'price' | 'months') => (e: React.ChangeEvent<HTMLInputElement>) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })) }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const price = Number(form.price.replace(/[$,\s]/g, ''))
    const months = Number(form.months)
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Escribe el nombre del plan, por ejemplo "Trimestral".'
    if (!Number.isFinite(price) || price <= 0) next.price = 'Escribe el precio en pesos, mayor que cero.'
    if (!Number.isInteger(months) || months <= 0) next.months = 'Escribe la duración en meses, en número entero.'
    setErrors(next)
    if (Object.keys(next).length) return
    const name = form.name.trim()
    saving.run(() => savePlan({ ...(plan ?? {}), name, price, months, offered: form.offered }), {
      onDone: () => onDone(plan ? `Guardaste el plan ${name}.` : `Creaste el plan ${name}. Ya aparece al registrar un negocio.`),
    })
  }
  return (
    <form onSubmit={submit} noValidate className="my-6 flex flex-col gap-5 rounded-control border border-divider bg-raised p-5">
      <p className="font-semibold">{plan ? `Editar plan ${plan.name}` : 'Plan nuevo'}</p>
      <TextField label="Nombre" value={form.name} onChange={set('name')} error={errors.name} autoFocus />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Precio" prefix="$" inputMode="decimal" value={form.price} onChange={set('price')} error={errors.price} />
        <TextField label="Duración en meses" inputMode="numeric" value={form.months} onChange={set('months')} error={errors.months} />
      </div>
      <Checkbox label="Se ofrece" hint="Si lo desmarcas, ya no se puede elegir al registrarse ni al pagar; quien ya lo tiene lo conserva hasta que venza." checked={form.offered} onChange={(e) => setForm((f) => ({ ...f, offered: e.target.checked }))} />
      {plan ? <p className="text-sm text-ink-soft">Un cambio de precio aplica a los próximos pagos, no a los que ya se hicieron.</p> : null}
      <div className="flex gap-3">
        <Button type="submit" {...saving.button}>{plan ? 'Guardar plan' : 'Crear plan'}</Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving.busy}>Cancelar</Button>
      </div>
    </form>
  )
}

// -------------------------------------------------------------- Negocios
// RF-W27: payment status of each business. RF-W28: activate or suspend it.
export function Businesses() {
  const { businesses, plans } = useSubscriptionsStore()
  const [filter, setFilter] = useState<string>('todos')
  const [target, setTarget] = useState<PlatformBusiness | null>(null)
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null)
  const payState = (b: PlatformBusiness) => {
    const st = subscriptionStatus(b.subscription).status
    return st === 'vencida' ? 'vencida' : b.subscription.kind === 'prueba' ? 'prueba' : st === 'por-vencer' ? 'por-vencer' : 'al-dia'
  }
  const counts: Record<string, number> = { vencida: 0, prueba: 0, 'por-vencer': 0, suspendidos: businesses.filter((b) => b.suspended).length }
  for (const b of businesses) if (payState(b) in counts) counts[payState(b)]++
  const list = businesses.filter((b) => (filter === 'todos' ? true : filter === 'suspendidos' ? b.suspended : payState(b) === filter))

  // SRS v1.2, 4.2.2 "Administrador": green up to date, amber expiring, red expired.
  const payText = (b: PlatformBusiness): Status => {
    const st = payState(b)
    const expiring = subscriptionStatus(b.subscription).status === 'por-vencer'
    const plan = plans.find((p) => p.id === b.subscription.planId)
    if (st === 'vencida') return { color: 'rojo', icon: 'atencion', label: `Pago pendiente desde el ${longDate(b.subscription.endsOn)}` }
    const color = expiring ? 'ambar' : 'verde'
    const icon = expiring ? 'reloj' : 'check'
    if (st === 'prueba') return { color, icon, label: `Prueba gratuita hasta el ${longDate(b.subscription.endsOn)}` }
    return { color, icon, label: `${plan?.name ?? 'Plan'}: pagado hasta el ${longDate(b.subscription.endsOn)}${expiring ? ' (vence en 7 días o menos)' : ''}` }
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-[28px] font-bold leading-tight">Negocios</h1>
      <p className="mt-1 max-w-prose text-ink-soft">Estado de pago de cada negocio registrado en SNIPP. Un negocio con pago pendiente o suspendido no aparece en la app ni recibe reservas.</p>

      <div role="radiogroup" aria-label="Filtro" className="mt-6 inline-flex flex-wrap gap-1 rounded-control bg-sunken p-1">
        {[['todos', `Todos (${businesses.length})`], ['vencida', `Pago pendiente (${counts.vencida})`], ['por-vencer', `Por vencer (${counts['por-vencer']})`], ['prueba', `En prueba (${counts.prueba})`], ['suspendidos', `Suspendidos (${counts.suspendidos})`]].map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={filter === k} onClick={() => setFilter(k)} className={radio(filter === k)}>{label}</button>
        ))}
      </div>

      {notice ? <div className="mt-6"><Note tone="done" title={notice.title}>{notice.body}</Note></div> : null}

      {list.length ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-divider text-sm text-ink-soft">
                <th scope="col" className="py-2.5 pr-4 font-medium">Negocio</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Estado de pago</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Último pago</th>
                <th scope="col" className="px-3 py-2.5 font-medium">En la app</th>
                <th scope="col" className="py-2.5 pl-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((b) => {
                const pay = payText(b)
                const visible = !b.suspended && payState(b) !== 'vencida'
                const last = b.payments[0]
                return (
                  <tr key={b.id} className="border-b border-divider align-top last:border-0">
                    <th scope="row" className="py-3 pr-4 font-normal">
                      <span className="block font-semibold">{b.name}</span>
                      <span className="block text-sm text-ink-soft">{b.owner ? `${b.owner} · ` : ''}{b.branches} {b.branches === 1 ? 'sucursal' : 'sucursales'} · desde el {longDate(b.joinedOn)}</span>
                    </th>
                    <td className="px-3 py-3">
                      <StatusTag status={pay} />
                    </td>
                    <td className="tabular px-3 py-3 text-sm">{last ? <>{money(last.amount)}, {longDate(last.on)}<br /><span className="text-ink-soft">{last.ref}</span></> : <span className="text-ink-soft">Sin pagos</span>}</td>
                    <td className="px-3 py-3">
                      {b.suspended ? <StatusTag status={{ color: 'gris', icon: 'pausa', label: 'Suspendido' }} /> : visible ? 'Visible' : 'Oculto por pago pendiente'}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <button type="button" onClick={() => { setTarget(b); setNotice(null) }} className="min-h-11 font-medium underline underline-offset-4">
                        {b.suspended ? 'Activar' : 'Suspender'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-8 text-ink-soft">No hay negocios con este filtro.</p>
      )}

      {target ? (
        <SuspendDialog
          business={target}
          onClose={() => setTarget(null)}
          onDone={(n) => { setTarget(null); setNotice(n) }}
        />
      ) : null}
    </div>
  )
}

function SuspendDialog({ business, onClose, onDone }: { business: PlatformBusiness; onClose: () => void; onDone: (n: { title: string; body: string }) => void }) {
  const activating = business.suspended
  const saving = useAction(activating
    ? { busy: 'Activando...', done: 'Negocio activado', failed: 'No se pudo activar' }
    : { busy: 'Suspendiendo...', done: 'Negocio suspendido', failed: 'No se pudo suspender' })
  const confirm = () => saving.run(() => setSuspended(business.id, !activating), {
    onDone: () => onDone(activating
      ? { title: `Activaste ${business.name}`, body: 'Vuelve a aparecer en la app si su suscripción está pagada o en prueba.' }
      : { title: `Suspendiste ${business.name}`, body: 'Ya no aparece en la app ni recibe reservas. Sus datos se conservan.' }),
  })
  return (
    <Dialog
      open
      onClose={onClose}
      title={activating ? `¿Activar ${business.name}?` : `¿Suspender ${business.name}?`}
      actions={<><Button variant="secondary" onClick={onClose} disabled={saving.busy}>Cancelar</Button><Button {...saving.button} onClick={confirm}>{activating ? 'Sí, activar' : 'Sí, suspender'}</Button></>}
    >
      <p>
        {activating
          ? 'El negocio y sus sucursales vuelven a mostrarse en la app y pueden recibir reservas, siempre que su suscripción esté al día.'
          : 'El negocio y sus sucursales dejan de aparecer en la app y no reciben reservas nuevas. No se borra ningún dato y se puede activar otra vez.'}
      </p>
    </Dialog>
  )
}

// ---------------------------------------------------- Reseñas reportadas
// RF-W28: reviews reported by a Jefe (RF-W23), with the reason. Deleting one
// removes it from the app.
export function ReportedReviews() {
  const { reviews } = useReportsStore()
  const { businesses } = useSubscriptionsStore()
  const [filter, setFilter] = useState<string>('pendientes')
  const [target, setTarget] = useState<{ review: ReportedReview; action: ReviewDecision } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const reported = reviews.filter((r): r is ReportedReview => !!r.reported).sort((a, b) => b.reported.on.getTime() - a.reported.on.getTime())
  const pending = reported.filter((r) => r.reported.state === 'enviado')
  const list = filter === 'pendientes' ? pending : reported.filter((r) => r.reported.state !== 'enviado')
  const businessName = (id: string) => businesses.find((b) => b.id === id)?.name ?? ''

  return (
    <div className="max-w-4xl">
      <h1 className="text-[28px] font-bold leading-tight">Reseñas reportadas</h1>
      <p className="mt-1 max-w-prose text-ink-soft">Reseñas que el Jefe de un negocio reportó como inapropiadas. Si la eliminas, deja de mostrarse en la app.</p>

      <div role="radiogroup" aria-label="Filtro" className="mt-6 inline-flex gap-1 rounded-control bg-sunken p-1">
        {[['pendientes', `Por revisar (${pending.length})`], ['revisadas', `Revisadas (${reported.length - pending.length})`]].map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={filter === k} onClick={() => setFilter(k)} className={radio(filter === k)}>{label}</button>
        ))}
      </div>

      {notice ? <div className="mt-6"><Note tone="done" title={notice} /></div> : null}

      {list.length ? (
        <ul className="mt-6">
          {list.map((r) => (
            <li key={r.id} className="border-b border-divider py-5 last:border-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Flag size={16} weight="fill" aria-hidden="true" />
                {businessName(r.businessId)} la reportó el {longDate(r.reported.on)}: {r.reported.reason}
              </p>
              {r.reported.detail ? <p className="mt-0.5 text-sm">«{r.reported.detail}»</p> : null}
              <blockquote className="mt-3 border-l-[3px] border-gray-light pl-4">
                <p className="flex flex-wrap items-center gap-x-3">
                  <span className="font-semibold">{r.author}</span>
                  <span className="inline-flex items-center gap-0.5" aria-label={`${r.stars} de 5 estrellas`}>
                    {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} weight={n <= r.stars ? 'fill' : 'regular'} aria-hidden="true" />)}
                  </span>
                </p>
                <p className="text-sm text-ink-soft">{longDate(r.on)} · {r.service}</p>
                <p className={`mt-1 text-[15px] ${r.reported.state === 'eliminada' ? 'line-through' : ''}`}>{r.text}</p>
              </blockquote>
              {r.reported.state === 'enviado' ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={() => { setTarget({ review: r, action: 'eliminada' }); setNotice(null) }}>Eliminar reseña</Button>
                  <Button variant="secondary" onClick={() => { setTarget({ review: r, action: 'mantenida' }); setNotice(null) }}>Mantenerla</Button>
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold">{r.reported.state === 'eliminada' ? `Eliminada el ${longDate(r.reported.decidedOn ?? r.reported.on)}; ya no se muestra en la app.` : `Se mantuvo el ${longDate(r.reported.decidedOn ?? r.reported.on)}; sigue visible.`}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-ink-soft">{filter === 'pendientes' ? 'No hay reseñas reportadas por revisar.' : 'Todavía no has revisado ninguna.'}</p>
      )}

      {target ? (
        <DecideDialog
          {...target}
          businessName={businessName(target.review.businessId)}
          onClose={() => setTarget(null)}
          onDone={(t) => { setTarget(null); setNotice(t) }}
        />
      ) : null}
    </div>
  )
}

function DecideDialog({ review, action, businessName, onClose, onDone }: { review: ReportedReview; action: ReviewDecision; businessName: string; onClose: () => void; onDone: (text: string) => void }) {
  const del = action === 'eliminada'
  const saving = useAction(del
    ? { busy: 'Eliminando...', done: 'Reseña eliminada', failed: 'No se pudo eliminar' }
    : { busy: 'Guardando...', done: 'Reseña conservada', failed: 'No se pudo guardar' })
  const confirm = () => saving.run(() => decideReview(review.id, action), {
    onDone: () => onDone(del ? `Eliminaste la reseña de ${review.author}. Ya no se muestra en la app.` : `La reseña de ${review.author} se queda. El Jefe de ${businessName} ve que la revisaste.`),
  })
  return (
    <Dialog
      open
      onClose={onClose}
      title={del ? '¿Eliminar esta reseña?' : '¿Mantener esta reseña?'}
      actions={<><Button variant="secondary" onClick={onClose} disabled={saving.busy}>Cancelar</Button><Button {...saving.button} onClick={confirm}>{del ? 'Sí, eliminar' : 'Sí, mantenerla'}</Button></>}
    >
      <p>{del ? 'Deja de mostrarse en la app y ya no cuenta en la calificación del negocio. No se puede deshacer.' : 'Sigue visible en la app y el reporte queda como revisado.'}</p>
    </Dialog>
  )
}
