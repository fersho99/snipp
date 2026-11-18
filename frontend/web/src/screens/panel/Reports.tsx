'use client'

import type { Business } from '../../types/domain'
import type { ClientReport, ReportReason, ReportState } from '../../services/reports'
import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQueryState } from '@/lib/navigation'
import { useBusinessPanel } from '@/components/PanelContext'
import { ArrowLeft, CheckCircle, Clock, Flag , type Icon } from '@phosphor-icons/react'
import { Button, Note, TextArea } from '../../components/ui'
import { networkMessage, type ApiError } from '../../services/auth'
import { addNote, CLIENT_STATE, REPORT_REASONS, REPORT_STATE, setReportState, useReportsStore } from '../../services/reports'
import { useStaffStore } from '../../services/staff'
import { longDate, timeOfDay } from '../../theme'

const STATE_ICON: Record<ReportState, Icon> = { enviado: Flag, 'en revision': Clock, atendido: CheckCircle }
const selectCls = 'min-h-11 rounded-control border-2 border-transparent bg-sunken px-3 text-[15px] outline-none focus:border-ink-soft'

// Reportes (RF-W14), Jefe only. `sub` = 'detalle' opens one report.
export default function Reports({ sub }: { sub?: string }) {
  return sub === 'detalle' ? <ReportDetail /> : <Inbox />
}

function useNames() {
  const s = useStaffStore()
  // Reports keep the name even after the Empleado left the business (RN-16).
  const fallback: Record<string, string> = { luis: 'Luis Ortega', ramon: 'Ramón Cázares', oscar: 'Óscar Félix', itzel: 'Itzel Duarte' }
  return (id: string) => s.profiles[s.staff[id]?.email ?? '']?.displayName ?? s.staff[id]?.name ?? fallback[id] ?? 'Empleado'
}

function StateLabel({ state }: { state: ReportState }) {
  const Icon = STATE_ICON[state]
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
      <Icon size={16} weight={state === 'atendido' ? 'fill' : 'regular'} aria-hidden="true" />
      {REPORT_STATE[state]}
    </span>
  )
}

function Inbox() {
  const { business, branches } = useBusinessPanel()
  const { reports } = useReportsStore()
  const nameOf = useNames()
  const [params, setParams] = useQueryState()
  const employee = params.get('empleado') ?? 'todos'
  const filter = params.get('estado-reporte') ?? 'todos'
  const mine = reports.filter((r) => r.businessId === business.id).sort((a, b) => b.sentOn.getTime() - a.sentOn.getTime())
  const employeeIds = [...new Set(mine.map((r) => r.employeeId))]
  const list = mine.filter((r) => (employee === 'todos' || r.employeeId === employee) && (filter === 'todos' || r.state === filter))
  const counts = { enviado: 0, 'en revision': 0, atendido: 0 }
  for (const r of mine) counts[r.state]++
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? ''
  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v === 'todos') next.delete(k)
    else next.set(k, v)
    setParams(next, { replace: true })
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-[28px] font-bold leading-tight">Reportes</h1>
      <p className="mt-1 max-w-prose text-ink-soft">Lo que los clientes reportan sobre tus Empleados desde la app. Solo los ves tú y el Administrador de SNIPP; el Empleado reportado no los ve.</p>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div role="radiogroup" aria-label="Estado" className="inline-flex flex-wrap gap-1 rounded-control bg-sunken p-1">
          {[['todos', `Todos (${mine.length})`], ['enviado', `Nuevos (${counts.enviado})`], ['en revision', `En revisión (${counts['en revision']})`], ['atendido', `Atendidos (${counts.atendido})`]].map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={filter === k} onClick={() => setParam('estado-reporte', k)} className={`min-h-10 rounded-[8px] px-3.5 text-[15px] ${filter === k ? 'bg-raised font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.08)]' : 'text-ink-soft hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2">
          <span className="text-sm text-ink-soft">Empleado</span>
          <select value={employee} onChange={(e) => setParam('empleado', e.target.value)} className={selectCls}>
            <option value="todos">Todos</option>
            {employeeIds.map((id) => <option key={id} value={id}>{nameOf(id)}</option>)}
          </select>
        </label>
      </div>

      {employee !== 'todos' ? <EmployeeSummary reports={mine.filter((r) => r.employeeId === employee)} name={nameOf(employee)} business={business} /> : null}

      {list.length ? (
        <ul className="mt-6">
          {list.map((r) => (
            <li key={r.id} className="border-b border-divider last:border-0">
              <Link href={`/panel/reportes/${r.id}`} className="-mx-3 flex flex-col gap-1 rounded-control px-3 py-4 hover:bg-sunken sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0">
                  <p className={r.state === 'enviado' ? 'font-bold' : 'font-semibold'}>{nameOf(r.employeeId)} · {REPORT_REASONS[r.reason]}</p>
                  <p className="text-sm text-ink-soft">{branchName(r.branchId)} · cita {r.folio} del {longDate(r.apptOn)} · recibido el {longDate(r.sentOn)}</p>
                  <p className="mt-1 line-clamp-2 max-w-prose text-[15px]">{r.text}</p>
                </div>
                <div className="shrink-0 sm:pt-0.5"><StateLabel state={r.state} /></div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8">
          <p className="font-semibold">{mine.length ? 'No hay reportes con estos filtros' : 'Todavía no hay reportes'}</p>
          <p className="mt-1 max-w-prose">
            {mine.length ? 'Cambia el estado o el Empleado para ver otros.' : 'Cuando un cliente reporte a un Empleado desde una cita atendida o en la que el Empleado no se presentó, lo verás aquí y en el menú.'}
          </p>
        </div>
      )}
    </div>
  )
}

// RF-W14: the history of reports of one Empleado in this business.
function EmployeeSummary({ reports, name, business }: { reports: ClientReport[]; name: string; business: Business }) {
  const byReason: Record<string, number> = {}
  for (const r of reports) byReason[r.reason] = (byReason[r.reason] ?? 0) + 1
  return (
    <section className="mt-6 rounded-control bg-raised p-5" aria-label={`Historial de reportes de ${name}`}>
      <p className="font-semibold">Historial de reportes de {name}</p>
      <p className="mt-1 text-[15px]">
        {reports.length === 1 ? '1 reporte' : `${reports.length} reportes`} en {business.name}
        {reports.length ? `: ${Object.entries(byReason).map(([k, n]) => `${n} de ${REPORT_REASONS[k as ReportReason].toLowerCase()}`).join(', ')}.` : '.'}
      </p>
      <p className="mt-1 text-sm text-ink-soft">Solo cuentan los reportes de cuando trabajó aquí; los de otros negocios no se ven.</p>
    </section>
  )
}

function ReportDetail() {
  const { reportId } = useParams<{ reportId: string }>()
  const { business, branches, session } = useBusinessPanel()
  const { reports } = useReportsStore()
  const nameOf = useNames()
  const r = reports.find((x) => x.id === reportId && x.businessId === business.id)
  const [busy, setBusy] = useState<ReportState | null>(null)
  const [failure, setFailure] = useState<ApiError | null>(null)
  const [done, setDone] = useState<string | null>(null)

  if (!r) {
    return (
      <div className="max-w-xl">
        <BackLink />
        <h1 className="mt-6 text-[28px] font-bold leading-tight">No encontramos este reporte</h1>
        <p className="mt-2">Puede que la dirección esté mal escrita o que el reporte no sea de {business.name}.</p>
      </div>
    )
  }

  const first = r.client.split(' ')[0]
  const change = async (next: ReportState) => {
    setBusy(next)
    setFailure(null)
    try {
      await setReportState(r.id, next)
      setDone(`${first} ya ve el estado «${CLIENT_STATE[next]}» en la app.`)
    } catch (err) {
      setFailure(err as ApiError)
    } finally {
      setBusy(null)
    }
  }
  const timeline: ClientReport['changes'] = [{ on: r.sentOn, state: 'enviado' }, ...r.changes]

  return (
    <div className="max-w-3xl">
      <BackLink />
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight">Reporte sobre {nameOf(r.employeeId)}</h1>
          <p className="mt-1 text-ink-soft">{REPORT_REASONS[r.reason]} · {r.id}</p>
        </div>
        <StateLabel state={r.state} />
      </div>

      <blockquote className="mt-6 border-l-[3px] border-ink pl-4 text-[17px]">{r.text}</blockquote>

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[15px]">
        <dt className="text-ink-soft">Cliente</dt><dd>{r.client}</dd>
        <dt className="text-ink-soft">Cita</dt><dd>{r.folio} · {r.service} · {longDate(r.apptOn)}, {timeOfDay(r.apptOn)}</dd>
        <dt className="text-ink-soft">Sucursal</dt><dd>{branches.find((b) => b.id === r.branchId)?.name}</dd>
        <dt className="text-ink-soft">Recibido</dt><dd>{longDate(r.sentOn)}, {timeOfDay(r.sentOn)}</dd>
      </dl>
      <p className="mt-3 text-sm text-ink-soft">{nameOf(r.employeeId)} no ve este reporte ni los datos del cliente.</p>

      {/* Follow-up: en revisión, atendido. The client sees the change (RF-M14). */}
      <section className="mt-10" aria-labelledby="seguimiento">
        <h2 id="seguimiento" className="text-lg font-semibold">Seguimiento</h2>
        <ol className="mt-3 flex flex-col gap-2">
          {timeline.map((t, i) => (
            <li key={i} className="flex items-center gap-3 text-[15px]">
              <StateLabel state={t.state} />
              <span className="text-ink-soft">{longDate(t.on)}, {timeOfDay(t.on)}</span>
            </li>
          ))}
        </ol>
        {done ? <div className="mt-4"><Note tone="done" title={done} /></div> : null}
        {failure ? <div className="mt-4"><Note title={networkMessage(failure).title}>No se guardó el cambio. Intenta de nuevo.</Note></div> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          {r.state === 'enviado' ? <Button onClick={() => change('en revision')} loading={busy === 'en revision'}>Pasar a en revisión</Button> : null}
          {r.state !== 'atendido' ? <Button variant={r.state === 'enviado' ? 'secondary' : 'primary'} onClick={() => change('atendido')} loading={busy === 'atendido'}>Marcar como atendido</Button> : null}
        </div>
      </section>

      <Notes report={r} author={session.name} />
    </div>
  )
}

// RF-W14: internal notes, seen only by the Jefe.
function Notes({ report, author }: { report: ClientReport; author: string }) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [failure, setFailure] = useState<ApiError | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return setError('Escribe la nota antes de guardarla.')
    setBusy(true)
    setError(null)
    setFailure(null)
    try {
      await addNote(report.id, author, text.trim())
      setText('')
    } catch (err) {
      setFailure(err as ApiError)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="mt-12 border-t border-divider pt-8" aria-labelledby="notas">
      <h2 id="notas" className="text-lg font-semibold">Notas internas</h2>
      <p className="mt-1 text-sm text-ink-soft">Solo las ves tú. Ni el cliente ni el Empleado las ven.</p>
      {report.notes.length ? (
        <ul className="mt-4 flex flex-col gap-4">
          {report.notes.map((n) => (
            <li key={n.id} className="rounded-control bg-raised p-4">
              <p className="text-sm text-ink-soft">{n.author} · {longDate(n.on)}, {timeOfDay(n.on)}</p>
              <p className="mt-1 text-[15px]">{n.text}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-ink-soft">Todavía no hay notas.</p>
      )}
      <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-3">
        <TextArea label="Nueva nota" rows={3} value={text} onChange={(e) => { setText(e.target.value); setError(null) }} error={error} hint="Por ejemplo: qué dijo el Empleado y qué se acordó." />
        {failure ? <Note title={networkMessage(failure).title}>{networkMessage(failure).body}</Note> : null}
        <Button type="submit" variant="secondary" loading={busy} className="self-start">Guardar nota</Button>
      </form>
    </section>
  )
}

function BackLink() {
  return (
    <Link href="/panel/reportes" className="inline-flex min-h-11 items-center gap-2 font-medium hover:underline">
      <ArrowLeft size={18} aria-hidden="true" />
      Reportes
    </Link>
  )
}
