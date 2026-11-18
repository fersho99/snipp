'use client'

import type { Branch } from '../../types/domain'
import type { JoinRequest } from '../../data/demo'
import type { ClientReport } from '../../services/reports'
import type { DashboardData } from '../../services/dashboard'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useBranchPanel } from '@/components/PanelContext'
import { ArrowsLeftRight, Flag, Star, UserPlus , type Icon } from '@phosphor-icons/react'
import { Button, Note, Skeleton } from '../../components/ui'
import { DEMO_TODAY } from '../../data/demo'
import { employeeName, loadDashboard, pendingFor, RECORDS_START } from '../../services/dashboard'
import { networkMessage } from '../../services/auth'
import { REPORT_REASONS } from '../../services/reports'
import { addDays, count, dayMonth, fromInputDate, longDate, money, sameDay, timeOfDay, toInputDate } from '../../theme'

const TODAY = new Date(DEMO_TODAY.getFullYear(), DEMO_TODAY.getMonth(), DEMO_TODAY.getDate())
const MONTH = (d: Date) => d.toLocaleDateString('es-MX', { month: 'long' })

// Periods the Jefe can pick. "Elegir fechas" covers any test period.
const PRESETS: { id: string; label: string; range?: () => [Date, Date] }[] = [
  { id: 'semana', label: 'Últimos 7 días', range: () => [addDays(TODAY, -6), TODAY] },
  { id: 'mes', label: 'Este mes', range: () => [new Date(TODAY.getFullYear(), TODAY.getMonth(), 1), TODAY] },
  {
    id: 'mes-pasado',
    label: (() => { const m = MONTH(new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1)); return m[0].toUpperCase() + m.slice(1) })(),
    range: () => [new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1), new Date(TODAY.getFullYear(), TODAY.getMonth(), 0)],
  },
  { id: 'rango', label: 'Elegir fechas' },
]

function periodLabel(from: Date, to: Date) {
  if (sameDay(from, to)) return `El ${longDate(from)}`
  if (from.getMonth() === to.getMonth()) return `Del ${longDate(from).replace(/ de \S+$/, '')} al ${longDate(to)}`
  return `Del ${longDate(from)} al ${longDate(to)}`
}

// Jefe home (RF-W22): metrics of the selected branch and of each of its
// employees for a period, plus the notices for the whole business: new
// client reports (RF-W14) and requests to join or migrate (RF-W10, RF-W12).
export default function Dashboard() {
  const { business, activeBranch, branches } = useBranchPanel()
  const [preset, setPreset] = useState('semana')
  const [custom, setCustom] = useState({ from: toInputDate(addDays(TODAY, -13)), to: toInputDate(TODAY) })
  const [result, setResult] = useState<{ key: string; data?: DashboardData; error?: unknown } | null>(null)
  const [attempt, setAttempt] = useState(0)

  const current = PRESETS.find((p) => p.id === preset) ?? PRESETS[0]
  let from: Date | null = null
  let to: Date | null = null
  let rangeError: string | undefined
  if (current.range) [from, to] = current.range()
  else {
    from = fromInputDate(custom.from)
    to = fromInputDate(custom.to)
    if (!from || !to) rangeError = 'Escribe las dos fechas.'
    else if (from > to) rangeError = 'La fecha de inicio debe ser anterior o igual a la final.'
    else if (to > TODAY) rangeError = 'Solo hay registros hasta hoy.'
    else if (from < RECORDS_START) rangeError = `Los registros empiezan el ${longDate(RECORDS_START)}.`
  }

  const branchId = activeBranch.id
  const fromKey = rangeError || !from ? null : toInputDate(from)
  const toKey = rangeError || !to ? null : toInputDate(to)
  const key = rangeError ? null : `${branchId}|${fromKey}|${toKey}|${attempt}`
  useEffect(() => {
    if (!key || !fromKey || !toKey) return
    const start = fromInputDate(fromKey)
    const end = fromInputDate(toKey)
    if (!start || !end) return
    let alive = true
    loadDashboard(branchId, start, end)
      .then((data) => alive && setResult({ key, data }))
      .catch((error) => alive && setResult({ key, error }))
    return () => { alive = false }
  }, [key, branchId, fromKey, toKey])

  const settled = result?.key === key ? result : null
  const pending = pendingFor(business.id)

  return (
    <div className="max-w-6xl">
      <h1 className="text-[28px] font-bold leading-tight">Inicio</h1>
      <p className="mt-1 text-ink-soft">{activeBranch.name}, {activeBranch.address}{activeBranch.active ? '' : ' (desactivada)'}</p>

      <Pending reports={pending.reports} requests={pending.requests} branches={branches} />

      <section className="mt-12" aria-labelledby="metricas">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="metricas" className="text-xl font-bold">Métricas de la sucursal</h2>
            {!rangeError && from && to ? <p className="mt-1 text-ink-soft">{periodLabel(from, to)}</p> : null}
          </div>
          <div role="radiogroup" aria-label="Periodo" className="flex flex-wrap gap-1 rounded-control bg-sunken p-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={preset === p.id}
                onClick={() => setPreset(p.id)}
                className={`min-h-10 rounded-[8px] px-3.5 text-[15px] transition-colors ${
                  preset === p.id ? 'bg-raised font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.08)]' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {preset === 'rango' ? (
          <div className="mt-5 flex flex-wrap items-start gap-4">
            <DateInput label="Desde" value={custom.from} min={toInputDate(RECORDS_START)} max={toInputDate(TODAY)} onChange={(v) => setCustom((c) => ({ ...c, from: v }))} />
            <DateInput label="Hasta" value={custom.to} min={toInputDate(RECORDS_START)} max={toInputDate(TODAY)} onChange={(v) => setCustom((c) => ({ ...c, to: v }))} />
            {rangeError ? <p className="basis-full text-sm font-medium" role="alert">{rangeError}</p> : null}
          </div>
        ) : null}

        <div className="mt-8">
          {rangeError ? null : settled?.error ? (
            <Note title={networkMessage(settled.error).title} action={<Button variant="secondary" className="mt-3 self-start" onClick={() => setAttempt((n) => n + 1)}>Reintentar</Button>}>
              No pudimos calcular las métricas de este periodo.
            </Note>
          ) : !settled ? (
            <Loading />
          ) : !settled.data || isEmpty(settled.data) ? (
            <div>
              <p className="font-semibold">No hay registros en este periodo</p>
              <p className="mt-1 max-w-prose">{activeBranch.name} no tuvo citas, ventas ni reseñas entre esas fechas. Elige otro periodo.</p>
            </div>
          ) : (
            <Metrics data={settled.data} />
          )}
        </div>
      </section>
    </div>
  )
}

const isEmpty = (d: DashboardData) => d.appointments.total === 0 && d.sales.orders === 0 && d.rating.count === 0

function DateInput({ label, onChange, ...props }: { label: string; value: string; min: string; max: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="date"
        {...props}
        onChange={(e) => onChange(e.target.value)}
        className="tabular min-h-11 rounded-control border-2 border-transparent bg-sunken px-3 text-[15px] outline-none focus:border-ink-soft focus:bg-raised"
      />
    </label>
  )
}

function Loading() {
  return (
    <div aria-busy="true" aria-label="Calculando métricas">
      <div className="grid grid-cols-2 gap-x-8 gap-y-8 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-12 h-40 w-full" />
    </div>
  )
}

function Stat({ label, value, detail, icon }: { label: string; value: string; detail?: string; icon?: React.ReactNode }) {
  return (
    <div className="border-l-[3px] border-ink pl-4">
      <p className="text-sm font-medium text-ink-soft">{label}</p>
      <p className="tabular mt-1 flex items-center gap-1.5 font-title text-[34px] font-bold leading-none">
        {value}
        {icon}
      </p>
      <p className="mt-2 text-sm">{detail}</p>
    </div>
  )
}

function Metrics({ data }: { data: DashboardData }) {
  const { appointments: a, sales, rating, topProducts, employees } = data
  const misses = a.cancelled + a.noShow + a.staffNoShow
  const maxQty = Math.max(1, ...topProducts.map((p) => p.qty))

  return (
    <>
      {/* KPI row: citas, ventas, calificación (RF-W22) */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Citas atendidas" value={a.attended.toLocaleString('es-MX')} detail={`de ${count(a.total, 'cita agendada', 'citas agendadas')}`} />
        <Stat
          label="Citas no atendidas"
          value={misses.toLocaleString('es-MX')}
          detail={`${count(a.cancelled, 'cancelada', 'canceladas')} · ${a.noShow} no asistió · ${a.staffNoShow} Empleado no se presentó`}
        />
        <Stat label="Ventas de la tienda" value={money(sales.amount)} detail={`${count(sales.orders, 'pedido pagado', 'pedidos pagados')}${sales.refunded ? ` · ${count(sales.refunded, 'reembolsado', 'reembolsados')} sin contar` : ''}`} />
        <Stat
          label="Calificación promedio"
          value={rating.average != null ? rating.average.toFixed(1) : '—'}
          icon={rating.average != null ? <Star size={26} weight="fill" aria-hidden="true" /> : null}
          detail={rating.count ? `de ${count(rating.count, 'reseña', 'reseñas')}` : 'Sin reseñas en este periodo'}
        />
      </div>

      <div className="mt-14 grid gap-14 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Best sellers: one ink bar per product, ranked by pieces */}
        <section aria-labelledby="mas-vendidos">
          <h3 id="mas-vendidos" className="text-lg font-semibold">Productos más vendidos</h3>
          {topProducts.length ? (
            <ol className="mt-4 flex flex-col gap-5">
              {topProducts.map((p, i) => (
                <li key={p.id}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-medium"><span className="tabular mr-2 text-ink-soft">{i + 1}.</span>{p.name}</span>
                    <span className="tabular shrink-0 text-sm">{count(p.qty, 'pieza', 'piezas')} · {money(p.amount)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-sunken" aria-hidden="true">
                    <div className="h-2 rounded-full bg-ink" style={{ width: `${(p.qty / maxQty) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-ink-soft">No se vendieron productos en este periodo.</p>
          )}
        </section>

        {/* Per employee (RF-W22): citas and rating */}
        <section aria-labelledby="por-empleado" className="min-w-0">
          <h3 id="por-empleado" className="text-lg font-semibold">Por empleado</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-divider text-sm text-ink-soft">
                  <th scope="col" className="py-2.5 pr-4 font-medium">Empleado</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Atendidas</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Canceladas</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">No asistió</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium" title="Empleado no se presentó">No se presentó</th>
                  <th scope="col" className="py-2.5 pl-3 text-right font-medium">Calificación</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b border-divider last:border-0">
                    <th scope="row" className="py-3 pr-4 font-normal">
                      <span className="block font-semibold">{e.name}</span>
                      <span className="block text-sm text-ink-soft">{e.specialty}</span>
                    </th>
                    {e.bookable ? (
                      <>
                        <td className="tabular px-3 py-3 text-right font-semibold">{e.attended}</td>
                        <td className="tabular px-3 py-3 text-right">{e.cancelled}</td>
                        <td className="tabular px-3 py-3 text-right">{e.noShow}</td>
                        <td className="tabular px-3 py-3 text-right">{e.staffNoShow}</td>
                        <td className="tabular py-3 pl-3 text-right">
                          {e.rating.average != null ? (
                            <span className="inline-flex items-center gap-1">
                              <Star size={14} weight="fill" aria-hidden="true" />
                              <span className="font-semibold">{e.rating.average.toFixed(1)}</span>
                              <span className="text-sm text-ink-soft">({e.rating.count})</span>
                            </span>
                          ) : (
                            <span className="text-sm text-ink-soft">Sin reseñas</span>
                          )}
                        </td>
                      </>
                    ) : (
                      <td colSpan={5} className="py-3 pl-3 text-right text-sm text-ink-soft">No recibe citas</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!employees.length ? <p className="mt-3 text-ink-soft">Esta sucursal todavía no tiene Empleados vinculados.</p> : null}
        </section>
      </div>
    </>
  )
}

// Notices for the whole business. Each new report is one notice (RF-W14);
// each request shows when it was sent, and a migration when it expires (RN-11).
function Pending({ reports, requests, branches }: { reports: ClientReport[]; requests: JoinRequest[]; branches: Branch[] }) {
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? ''
  const total = reports.length + requests.length
  if (!total) {
    return <p className="mt-8 text-ink-soft">No tienes reportes nuevos ni solicitudes por revisar.</p>
  }
  return (
    <section className="mt-8" aria-labelledby="por-revisar">
      <h2 id="por-revisar" className="text-xl font-bold">Por revisar <span className="tabular text-ink-soft">({total})</span></h2>
      <ul className="mt-3 max-w-3xl">
        {reports.map((r) => (
          <Row
            key={r.id}
            Icon={Flag}
            title={`Reporte nuevo sobre ${employeeName(r.employeeId)}`}
            detail={`Motivo: ${REPORT_REASONS[r.reason]} · ${branchName(r.branchId)} · cita ${r.folio} · recibido el ${longDate(r.sentOn)}, ${timeOfDay(r.sentOn)}`}
            to={`/panel/reportes/${r.id}`}
            action="Ver reporte"
          />
        ))}
        {requests.map((s) => {
          const branch = branchName(s.branchId)
          if (s.kind === 'ingreso') {
            return (
              <Row key={s.id} Icon={UserPlus} title={`${s.name} pide unirse a ${branch}`} detail={`Solicitud de ingreso enviada el ${longDate(s.sentOn)}`} to="/panel/empleados" action="Revisar" />
            )
          }
          const expires = addDays(s.sentOn, 7)
          const when = sameDay(expires, TODAY) ? 'caduca hoy' : sameDay(expires, addDays(TODAY, 1)) ? `caduca mañana, ${dayMonth(expires)}` : `caduca el ${longDate(expires)}`
          return (
            <Row
              key={s.id}
              Icon={ArrowsLeftRight}
              title={`${s.name} pide migrar de ${s.from} a ${branch}`}
              detail={`Solicitud de migración enviada el ${longDate(s.sentOn)} · ${when} si no respondes`}
              to="/panel/empleados"
              action="Revisar"
            />
          )
        })}
      </ul>
    </section>
  )
}

function Row({ Icon, title, detail, to, action }: { Icon: Icon; title: string; detail: string; to: string; action: string }) {
  return (
    <li className="flex flex-col gap-2 border-b border-divider py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex gap-3">
        <Icon size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-ink-soft">{detail}</p>
        </div>
      </div>
      <Link href={to} className="ml-[34px] shrink-0 font-medium underline underline-offset-4 sm:ml-0">{action}</Link>
    </li>
  )
}
