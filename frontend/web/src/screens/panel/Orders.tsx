'use client'

import type { Branch } from '../../types/domain'
import type { Order, OrderStatus } from '../../services/shop'
import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQueryState } from '@/lib/navigation'
import { useBranchPanel } from '@/components/PanelContext'
import { ArrowLeft } from '@phosphor-icons/react'
import { StatusCard, StatusTag } from '../../components/status'
import { Button, Dialog, Note, TextArea } from '../../components/ui'
import { networkMessage, type ApiError } from '../../services/auth'
import { advanceOrder, cancelOrder, CLIENT_ORDER_STATE, NEXT, ORDER_STATE, orderTotal, useShopStore } from '../../services/shop'
import { useStaffStore } from '../../services/staff'
import { longDate, money, timeOfDay } from '../../theme'

const ACTION: Partial<Record<OrderStatus, string>> = { listo: 'Marcar listo para recoger', entregado: 'Marcar entregado' }

// Pedidos (RF-W21): the Jefe sees the branch picked in the menu; an Empleado,
// their own branch (RN-10). Both move an order forward or cancel it.
export default function Orders({ sub }: { sub?: string }) {
  const { session, activeBranch, branches } = useBranchPanel()
  const staff = useStaffStore()
  const me = Object.values(staff.staff).find((e) => e.email === session.email)
  const branch = session.role === 'jefe' ? activeBranch : branches.find((b) => b.id === me?.branchId)
  if (!branch) return <p className="text-ink-soft">No estás vinculado a ninguna sucursal.</p>
  return sub === 'detalle' ? <OrderDetail branch={branch} /> : <OrderList branch={branch} />
}

function StateLabel({ status }: { status: OrderStatus }) {
  return <StatusTag status={ORDER_STATE[status]} />
}

function OrderList({ branch }: { branch: Branch }) {
  const s = useShopStore()
  const [params, setParams] = useQueryState()
  const filter = params.get('estado-pedido') ?? 'pendientes'
  const mine = s.orders.filter((o) => o.branchId === branch.id).sort((a, b) => b.timeline[0][1].getTime() - a.timeline[0][1].getTime())
  const count = (st: OrderStatus) => mine.filter((o) => o.status === st).length
  const list = mine.filter((o) => (filter === 'pendientes' ? ['pagado', 'listo'].includes(o.status) : filter === 'todos' ? true : o.status === filter))
  const tabs = [
    ['pendientes', `Por entregar (${count('pagado') + count('listo')})`],
    ['entregado', `Entregados (${count('entregado')})`],
    ['cancelado', `Cancelados (${count('cancelado')})`],
    ['todos', `Todos (${mine.length})`],
  ]

  return (
    <div className="max-w-4xl">
      <h1 className="text-[28px] font-bold leading-tight">Pedidos</h1>
      <p className="mt-1 max-w-prose text-ink-soft">{branch.name} · pedidos pagados en la app con Stripe. Se recogen en la sucursal; no hay envío a domicilio.</p>

      <div role="radiogroup" aria-label="Estado" className="mt-6 inline-flex flex-wrap gap-1 rounded-control bg-sunken p-1">
        {tabs.map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={filter === k} onClick={() => setParams(k === 'pendientes' ? {} : { 'estado-pedido': k }, { replace: true })} className={`min-h-10 rounded-[8px] px-3.5 text-[15px] ${filter === k ? 'bg-raised font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.08)]' : 'text-ink-soft hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>

      {list.length ? (
        <ul className="mt-6 flex flex-col gap-3">
          {list.map((o) => {
            const pieces = o.items.reduce((sum, it) => sum + it.qty, 0)
            return (
              <li key={o.folio}>
                <Link href={`/panel/pedidos/${o.folio}`} className="block rounded-control hover:brightness-[0.97]">
                  <StatusCard color={ORDER_STATE[o.status].color} className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <div className="min-w-0">
                      <p className="font-semibold"><span className="tabular">{o.folio}</span> · {o.client}</p>
                      <p className="text-sm text-ink-soft">{pieces} {pieces === 1 ? 'producto' : 'productos'} · pagado el {longDate(o.timeline[0][1])}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-5">
                      <span className="tabular font-semibold">{money(orderTotal(o))}</span>
                      <StateLabel status={o.status} />
                    </div>
                  </StatusCard>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-8">
          <p className="font-semibold">{mine.length ? 'No hay pedidos con este filtro' : 'Todavía no hay pedidos'}</p>
          <p className="mt-1 max-w-prose">{mine.length ? 'Cambia el filtro para ver los demás.' : 'Cuando un cliente compre en la tienda de esta sucursal y pague con tarjeta, el pedido aparece aquí.'}</p>
        </div>
      )}
    </div>
  )
}

function OrderDetail({ branch }: { branch: Branch }) {
  const { folio } = useParams<{ folio: string }>()
  const s = useShopStore()
  const o = s.orders.find((x) => x.folio === folio && x.branchId === branch.id)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<ApiError | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  if (!o) {
    return (
      <div className="max-w-xl">
        <BackLink />
        <h1 className="mt-6 text-[28px] font-bold leading-tight">No encontramos este pedido</h1>
        <p className="mt-2">Puede que sea de otra sucursal o que el folio esté mal escrito.</p>
      </div>
    )
  }

  const first = o.client.split(' ')[0]
  const advance = async () => {
    const next = NEXT[o.status]
    if (!next) return
    setBusy(true)
    setFailure(null)
    try {
      await advanceOrder(o.folio)
      setDone(`${first} ya ve «${CLIENT_ORDER_STATE[next]}» en la app y recibió una notificación.`)
    } catch (err) {
      setFailure(err as ApiError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <BackLink />
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="tabular text-[28px] font-bold leading-tight">Pedido {o.folio}</h1>
          <p className="mt-1 text-ink-soft">{o.client} · {branch.name}</p>
        </div>
        <StateLabel status={o.status} />
      </div>

      <table className="mt-6 w-full text-left text-[15px]">
        <tbody>
          {o.items.map((it) => (
            <tr key={it.productId} className="border-b border-divider">
              <td className="py-2.5 pr-3">{it.qty} × {it.name}</td>
              <td className="tabular py-2.5 text-right">{money(it.qty * it.price)}</td>
            </tr>
          ))}
          {o.pointsUsed ? (
            <tr className="border-b border-divider">
              <td className="py-2.5 pr-3">Descuento con {o.pointsUsed} puntos</td>
              <td className="tabular py-2.5 text-right">−{money(o.discount ?? 0)}</td>
            </tr>
          ) : null}
          <tr>
            <td className="py-2.5 pr-3 font-semibold">Pagado con tarjeta (Stripe)</td>
            <td className="tabular py-2.5 text-right font-semibold">{money(orderTotal(o))}</td>
          </tr>
        </tbody>
      </table>
      <p className="tabular mt-1 text-sm text-ink-soft">Referencia de pago: {o.paymentRef}</p>

      {o.refund ? (
        <div className="mt-6 rounded-control bg-sunken px-5 py-4">
          <p className="font-semibold">Reembolsado por Stripe: {money(o.refund.amount)}</p>
          <p className="tabular text-sm">Referencia del reembolso: {o.refund.ref}</p>
          {o.refund.reason ? <p className="mt-1 text-sm">Motivo que vio el cliente: {o.refund.reason}</p> : null}
        </div>
      ) : null}

      <section className="mt-10" aria-labelledby="estado-pedido">
        <h2 id="estado-pedido" className="text-lg font-semibold">Estado</h2>
        <ol className="mt-3 flex flex-col gap-2">
          {o.timeline.map(([st, on], i) => (
            <li key={i} className="flex items-center gap-3"><StateLabel status={st} /><span className="text-ink-soft">{longDate(on)}, {timeOfDay(on)}</span></li>
          ))}
        </ol>
        {done ? <div className="mt-4"><Note tone="done" title={done} /></div> : null}
        {failure ? <div className="mt-4"><Note title={networkMessage(failure).title}>No se guardó el cambio. Intenta de nuevo.</Note></div> : null}
        {NEXT[o.status] ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={advance} loading={busy}>{ACTION[NEXT[o.status] ?? 'pagado']}</Button>
            <Button variant="secondary" onClick={() => { setCancelling(true); setDone(null) }}>Cancelar y reembolsar</Button>
          </div>
        ) : null}
      </section>

      {cancelling ? <CancelDialog order={o} onClose={() => setCancelling(false)} onDone={() => { setCancelling(false); setDone(`Cancelaste el pedido. Stripe le devuelve ${money(orderTotal(o))} a ${first} y le avisamos por notificación.`) }} /> : null}
    </div>
  )
}

// RN-06: cancelling a paid order refunds it with Stripe.
function CancelDialog({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [failure, setFailure] = useState<ApiError | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (!reason.trim()) return setError('Escribe el motivo; el cliente lo ve junto al reembolso.')
    setBusy(true)
    setFailure(null)
    try {
      await cancelOrder(order.folio, reason.trim())
      onDone()
    } catch (err) {
      setFailure(err as ApiError)
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={`¿Cancelar el pedido ${order.folio}?`}
      actions={<><Button variant="secondary" onClick={onClose}>No</Button><Button onClick={submit} loading={busy}>Sí, cancelar y reembolsar</Button></>}
    >
      <p>Stripe le devuelve {money(orderTotal(order))} a {order.client} en la misma tarjeta. Las piezas regresan a las existencias de la sucursal. No se puede deshacer.</p>
      <TextArea label="Motivo" rows={2} value={reason} onChange={(e) => { setReason(e.target.value); setError(null) }} error={error} hint="Por ejemplo: La sucursal se quedó sin pomada." />
      {failure ? (
        <Note title={failure.code === 'stripe' ? 'Stripe no pudo hacer el reembolso' : networkMessage(failure).title}>
          {failure.code === 'stripe' ? 'El pedido sigue pagado y no se canceló. Intenta de nuevo en unos minutos.' : 'No se canceló el pedido. Intenta de nuevo.'}
        </Note>
      ) : null}
    </Dialog>
  )
}

function BackLink() {
  return (
    <Link href="/panel/pedidos" className="inline-flex min-h-11 items-center gap-2 font-medium hover:underline">
      <ArrowLeft size={18} aria-hidden="true" />
      Pedidos
    </Link>
  )
}
