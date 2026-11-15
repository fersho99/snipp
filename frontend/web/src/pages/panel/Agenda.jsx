import { useState } from 'react'
import { useOutletContext } from 'react-router'
import { CaretLeft, CaretRight, LockSimple } from '@phosphor-icons/react'
import { STATUS_ICON } from './agendaIcons'
import { Button, Note } from '../../components/ui'
import { AppointmentDialog, BlockDialog, BulkCancelDialog, BulkReassignDialog } from './AgendaDialogs'
import { DEMO_TODAY } from '../../data/demo'
import { networkMessage } from '../../services/auth'
import { removeBlock, STATUS } from '../../services/agenda'
import { useStaffStore } from '../../services/staff'
import { addDays, dayMonth, longDate, sameDay, timeOfDay } from '../../theme'

const TODAY = new Date(DEMO_TODAY.getFullYear(), DEMO_TODAY.getMonth(), DEMO_TODAY.getDate())
const HOUR_PX = 64
const DAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7))
const minutesOf = (t) => Number(t.split(':')[0]) * 60 + Number(t.split(':')[1])

// Agenda (RF-W15, RF-W16, RF-W18). The Jefe sees and manages every
// appointment of the selected branch; an Empleado sees their branch and
// manages only their own (RN-03).
export default function Agenda() {
  const { session, activeBranch, branches } = useOutletContext()
  const s = useStaffStore()
  const isJefe = session.role === 'jefe'
  const me = Object.values(s.staff).find((e) => e.email === session.email)
  const branch = isJefe ? activeBranch : branches.find((b) => b.id === me?.branchId)

  const [view, setView] = useState('dia')
  const [date, setDate] = useState(TODAY)
  const [who, setWho] = useState(isJefe ? 'todos' : 'mias')
  const [open, setOpen] = useState(null) // folio
  const [dialog, setDialog] = useState(null) // 'bloquear' | 'reasignar-todas' | 'cancelar-todas'
  const [notice, setNotice] = useState(null)

  if (!branch) return <p className="text-ink-soft">No estás vinculado a ninguna sucursal.</p>

  const people = Object.values(s.staff).filter((e) => e.branchId === branch.id && e.bookable)
  const shown = isJefe ? (who === 'todos' ? people : people.filter((e) => e.id === who)) : who === 'mias' ? people.filter((e) => e.id === me?.id) : people
  const shownIds = new Set(shown.map((e) => e.id))
  const appts = s.appointments.filter((a) => a.branchId === branch.id && shownIds.has(a.employeeId))
  const blocks = s.blocks.filter((b) => b.branchId === branch.id && shownIds.has(b.employeeId))
  const selected = isJefe && who !== 'todos' ? s.staff[who] : null
  const nameOf = (id) => s.profiles[s.staff[id]?.email]?.displayName ?? s.staff[id]?.name ?? 'Empleado'
  const openAppt = s.appointments.find((a) => a.folio === open)

  const step = view === 'dia' ? 1 : 7
  const days = view === 'dia' ? [date] : Array.from({ length: 7 }, (_, i) => addDays(mondayOf(date), i)).filter((d) => d.getDay() !== 0 || branch.hours[0])
  const rangeLabel = view === 'dia' ? longDate(date) : `Semana del ${dayMonth(days[0])} al ${dayMonth(days[days.length - 1])}`
  const selectCls = 'min-h-11 rounded-control border-2 border-transparent bg-sunken px-3 text-[15px] outline-none focus:border-ink-soft'

  return (
    <div className="max-w-6xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight">Agenda</h1>
          <p className="mt-1 text-ink-soft">{branch.name}, {branch.address}</p>
        </div>
        <Button variant="secondary" className="self-start lg:self-auto" onClick={() => { setDialog('bloquear'); setNotice(null) }}>
          <LockSimple size={18} aria-hidden="true" />
          Bloquear horario
        </Button>
      </div>

      {/* Toolbar: dates, view and who */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setDate((d) => addDays(d, -step))} className="flex size-11 items-center justify-center rounded-control hover:bg-sunken" aria-label={view === 'dia' ? 'Día anterior' : 'Semana anterior'}>
            <CaretLeft size={20} />
          </button>
          <button type="button" onClick={() => setDate(TODAY)} className="min-h-11 rounded-control px-3 font-medium hover:bg-sunken">Hoy</button>
          <button type="button" onClick={() => setDate((d) => addDays(d, step))} className="flex size-11 items-center justify-center rounded-control hover:bg-sunken" aria-label={view === 'dia' ? 'Día siguiente' : 'Semana siguiente'}>
            <CaretRight size={20} />
          </button>
          <p className="ml-2 font-semibold" aria-live="polite">{rangeLabel}</p>
        </div>
        <div role="radiogroup" aria-label="Vista" className="inline-flex gap-1 rounded-control bg-sunken p-1">
          {[['dia', 'Día'], ['semana', 'Semana']].map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={view === k} onClick={() => setView(k)} className={`min-h-9 rounded-[8px] px-3.5 text-[15px] ${view === k ? 'bg-raised font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.08)]' : 'text-ink-soft hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2">
          <span className="text-sm text-ink-soft">Mostrar</span>
          <select value={who} onChange={(e) => setWho(e.target.value)} className={selectCls}>
            {isJefe ? (
              <>
                <option value="todos">Todos los Empleados</option>
                {people.map((e) => <option key={e.id} value={e.id}>{nameOf(e.id)}</option>)}
              </>
            ) : (
              <>
                <option value="mias">Mis citas</option>
                <option value="sucursal">Toda la sucursal</option>
              </>
            )}
          </select>
        </label>
      </div>

      {/* RF-W16: bulk actions on one Empleado's upcoming appointments */}
      {selected ? (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
          <span className="text-ink-soft">Todas las citas futuras de {nameOf(selected.id)}:</span>
          <button type="button" className="font-medium underline underline-offset-4" onClick={() => { setDialog('reasignar-todas'); setNotice(null) }}>Reasignarlas</button>
          <button type="button" className="font-medium underline underline-offset-4" onClick={() => { setDialog('cancelar-todas'); setNotice(null) }}>Cancelarlas</button>
        </div>
      ) : null}
      {!isJefe && who === 'sucursal' ? <p className="mt-3 text-sm text-ink-soft">Puedes ver las citas de toda la sucursal, pero solo cambiar las tuyas.</p> : null}

      {notice ? <div className="mt-5"><Note tone="done" title={notice.title}>{notice.body}</Note></div> : null}

      <div className="mt-6">
        {!people.length ? (
          <p className="text-ink-soft">Esta sucursal todavía no tiene Empleados que reciban citas.</p>
        ) : view === 'dia' ? (
          <DayGrid day={date} branch={branch} people={shown} appts={appts} blocks={blocks} nameOf={nameOf} onOpen={setOpen} />
        ) : (
          <WeekList days={days} branch={branch} appts={appts} blocks={blocks} nameOf={nameOf} onOpen={setOpen} />
        )}
      </div>

      <Blocks blocks={blocks.filter((b) => b.to >= DEMO_TODAY)} nameOf={nameOf} canRemove={(b) => isJefe || b.employeeId === me?.id} />

      {openAppt ? <AppointmentDialog session={session} appt={openAppt} nameOf={nameOf} onClose={() => setOpen(null)} /> : null}
      {dialog === 'bloquear' ? (
        <BlockDialog
          session={session}
          branch={branch}
          people={isJefe ? people : people.filter((e) => e.id === me?.id)}
          nameOf={nameOf}
          onClose={() => setDialog(null)}
          onDone={(n) => { setDialog(null); setNotice(n) }}
        />
      ) : null}
      {dialog === 'reasignar-todas' && selected ? (
        <BulkReassignDialog from={selected} people={people} nameOf={nameOf} onClose={() => setDialog(null)} onDone={(n) => { setDialog(null); setNotice(n) }} />
      ) : null}
      {dialog === 'cancelar-todas' && selected ? (
        <BulkCancelDialog from={selected} nameOf={nameOf} onClose={() => setDialog(null)} onDone={(n) => { setDialog(null); setNotice(n) }} />
      ) : null}
    </div>
  )
}

function StatusText({ status, compact }) {
  const Icon = STATUS_ICON[status]
  return (
    <span className={`inline-flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'}`}>
      <Icon size={compact ? 13 : 16} weight={status === 'atendida' ? 'fill' : 'regular'} aria-hidden="true" />
      {STATUS[status]}
    </span>
  )
}

// One column per Empleado, one row per hour, within the branch hours of that day.
function DayGrid({ day, branch, people, appts, blocks, nameOf, onOpen }) {
  const hours = branch.hours[day.getDay()]
  const todays = appts.filter((a) => sameDay(a.start, day))
  const cancelled = todays.filter((a) => a.status === 'cancelada')
  const [showCancelled, setShowCancelled] = useState(false)
  if (!hours) return <p className="text-ink-soft">{branch.name} no abre los {['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'][day.getDay()]}.</p>

  const open = minutesOf(hours[0])
  const close = minutesOf(hours[1])
  const height = ((close - open) / 60) * HOUR_PX
  const top = (d) => (((d.getHours() * 60 + d.getMinutes()) - open) / 60) * HOUR_PX
  const marks = []
  for (let m = Math.ceil(open / 60) * 60; m <= close; m += 60) marks.push(m)
  const nowLine = sameDay(day, DEMO_TODAY) ? top(DEMO_TODAY) : null

  return (
    <div>
      <div className="overflow-x-auto rounded-control bg-raised">
        <div className="flex min-w-max pb-3">
          {/* time column */}
          <div className="sticky left-0 z-10 w-16 shrink-0 bg-raised">
            <div className="h-12 border-b border-divider" />
            <div className="relative" style={{ height }}>
              {marks.map((m) => (
                <span key={m} className="tabular absolute right-2 -translate-y-1/2 text-xs text-ink-soft" style={{ top: ((m - open) / 60) * HOUR_PX }}>
                  {timeOfDay(new Date(2026, 0, 1, Math.floor(m / 60), 0)).replace(':00', '')}
                </span>
              ))}
            </div>
          </div>
          {people.map((e) => {
            const mine = todays.filter((a) => a.employeeId === e.id && a.status !== 'cancelada')
            const myBlocks = blocks.filter((b) => b.employeeId === e.id && b.from < addDays(day, 1) && b.to > day)
            const work = e.schedule[day.getDay()]
            return (
              <div key={e.id} className="w-56 shrink-0 border-l border-divider">
                <div className="flex h-12 flex-col justify-center border-b border-divider px-3">
                  <p className="truncate text-sm font-semibold">{nameOf(e.id)}</p>
                  <p className="truncate text-xs text-ink-soft">{work ? `${work[0]} a ${work[1]}` : 'Descansa'}{e.status === 'migracion-pendiente' ? ' · migración pendiente' : ''}</p>
                </div>
                <div className="relative" style={{ height }}>
                  {marks.map((m) => <div key={m} className="absolute inset-x-0 border-t border-divider/70" style={{ top: ((m - open) / 60) * HOUR_PX }} />)}
                  {/* Outside the Empleado's work hours */}
                  {!work ? <div className="absolute inset-0 bg-sunken/70" /> : (
                    <>
                      {minutesOf(work[0]) > open ? <div className="absolute inset-x-0 top-0 bg-sunken/70" style={{ height: ((minutesOf(work[0]) - open) / 60) * HOUR_PX }} /> : null}
                      {minutesOf(work[1]) < close ? <div className="absolute inset-x-0 bottom-0 bg-sunken/70" style={{ height: ((close - minutesOf(work[1])) / 60) * HOUR_PX }} /> : null}
                    </>
                  )}
                  {myBlocks.map((b) => {
                    const from = b.from < day ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0) : b.from
                    const to = b.to > addDays(day, 1) ? addDays(day, 1) : b.to
                    const y = Math.max(0, top(from))
                    const h = Math.min(height, top(to)) - y
                    return h > 0 ? (
                      <div key={b.id} className="absolute inset-x-1 flex items-start gap-1 overflow-hidden rounded-md border border-gray-light bg-sunken-pressed px-2 py-1 text-xs font-semibold" style={{ top: y, height: h }}>
                        <LockSimple size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                        {b.reason}
                      </div>
                    ) : null
                  })}
                  {mine.map((a) => {
                    const h = Math.max(28, (a.minutes / 60) * HOUR_PX - 3)
                    const past = ['atendida', 'no-asistio', 'empleado-no-se-presento'].includes(a.status)
                    return (
                      <button
                        key={a.folio}
                        type="button"
                        onClick={() => onOpen(a.folio)}
                        className={`absolute inset-x-1 overflow-hidden rounded-md px-2 py-1 text-left transition-colors ${past ? 'bg-sunken text-ink-soft hover:bg-sunken-pressed' : 'border-l-[3px] border-ink bg-paper hover:bg-sunken'} ${a.status === 'cambio' ? 'border-dashed' : ''}`}
                        style={{ top: top(a.start) + 1, height: h }}
                        aria-label={`${timeOfDay(a.start)}, ${a.client}, ${a.service}, ${STATUS[a.status]}`}
                      >
                        <p className="tabular truncate text-xs font-semibold">{timeOfDay(a.start)} · {a.client}</p>
                        {h > 34 ? <p className="truncate text-xs">{a.service}</p> : null}
                        {h > 52 ? <StatusText status={a.status} compact /> : null}
                      </button>
                    )
                  })}
                  {nowLine != null && nowLine >= 0 && nowLine <= height ? <div className="pointer-events-none absolute inset-x-0 border-t-2 border-ink" style={{ top: nowLine }} aria-hidden="true" /> : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-soft">
        <span>{todays.filter((a) => a.status !== 'cancelada').length} citas este día</span>
        {cancelled.length ? (
          <button type="button" className="font-medium text-ink underline underline-offset-4" onClick={() => setShowCancelled((v) => !v)}>
            {showCancelled ? 'Ocultar' : 'Ver'} {cancelled.length === 1 ? '1 cancelada' : `${cancelled.length} canceladas`}
          </button>
        ) : null}
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-4 rounded-sm bg-sunken" /> Fuera de su horario</span>
        <span className="inline-flex items-center gap-1.5"><LockSimple size={13} /> Bloqueado</span>
      </div>
      {showCancelled ? (
        <ul className="mt-3 max-w-2xl">
          {cancelled.map((a) => (
            <li key={a.folio} className="flex items-center justify-between gap-4 border-b border-divider py-2.5 last:border-0">
              <span>{timeOfDay(a.start)} · {a.client} · {a.service} · {nameOf(a.employeeId)}</span>
              <button type="button" className="text-sm font-medium underline underline-offset-4" onClick={() => onOpen(a.folio)}>Ver</button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function WeekList({ days, branch, appts, blocks, nameOf, onOpen }) {
  return (
    <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {days.map((d) => {
        const list = appts.filter((a) => sameDay(a.start, d) && a.status !== 'cancelada').sort((a, b) => a.start - b.start)
        const dayBlocks = blocks.filter((b) => b.from < addDays(d, 1) && b.to > d)
        const isToday = sameDay(d, TODAY)
        return (
          <section key={d.toISOString()} aria-label={longDate(d)}>
            <h3 className={`border-b pb-1.5 text-[15px] ${isToday ? 'border-b-[3px] border-ink font-bold' : 'border-divider font-semibold'}`}>
              {DAY_SHORT[d.getDay()]} {d.getDate()}{isToday ? ' · hoy' : ''}
            </h3>
            {!branch.hours[d.getDay()] ? <p className="mt-2 text-sm text-ink-soft">Cerrado</p> : null}
            {dayBlocks.map((b) => (
              <p key={b.id} className="mt-2 flex items-center gap-1 text-xs font-semibold"><LockSimple size={12} aria-hidden="true" />{nameOf(b.employeeId)}: {b.reason}</p>
            ))}
            <ul className="mt-2 flex flex-col gap-1.5">
              {list.map((a) => (
                <li key={a.folio}>
                  <button type="button" onClick={() => onOpen(a.folio)} className={`w-full rounded-md px-2 py-1.5 text-left hover:bg-sunken ${a.status === 'confirmada' || a.status === 'cambio' ? 'border-l-[3px] border-ink bg-raised' : 'bg-sunken/60 text-ink-soft'}`}>
                    <p className="tabular text-xs font-semibold">{timeOfDay(a.start)} · {nameOf(a.employeeId).split(' ')[0]}</p>
                    <p className="truncate text-xs">{a.client} · {a.service}</p>
                    {a.status === 'cambio' ? <StatusText status="cambio" compact /> : null}
                  </button>
                </li>
              ))}
            </ul>
            {branch.hours[d.getDay()] && !list.length ? <p className="mt-2 text-sm text-ink-soft">Sin citas</p> : null}
          </section>
        )
      })}
    </div>
  )
}

// RF-W15: breaks and days off, current and upcoming.
function Blocks({ blocks, nameOf, canRemove }) {
  const [busy, setBusy] = useState(null)
  const [failure, setFailure] = useState(null)
  const fmt = (b) => (sameDay(b.from, b.to) ? `${longDate(b.from)}, ${timeOfDay(b.from)} a ${timeOfDay(b.to)}` : `Del ${longDate(b.from)} al ${longDate(b.to)}`)
  const remove = async (id) => {
    setBusy(id)
    setFailure(null)
    try {
      await removeBlock(id)
    } catch (err) {
      setFailure(err)
    } finally {
      setBusy(null)
    }
  }
  return (
    <section className="mt-12" aria-labelledby="bloqueos">
      <h2 id="bloqueos" className="text-lg font-semibold">Horarios bloqueados</h2>
      <p className="mt-1 text-sm text-ink-soft">En estos horarios la app no ofrece citas.</p>
      {blocks.length ? (
        <ul className="mt-3 max-w-2xl">
          {blocks.sort((a, b) => a.from - b.from).map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-4 border-b border-divider py-3 last:border-0">
              <div>
                <p className="font-medium">{nameOf(b.employeeId)} · {b.reason}</p>
                <p className="text-sm text-ink-soft">{fmt(b)}</p>
              </div>
              {canRemove(b) ? (
                <button type="button" onClick={() => remove(b.id)} disabled={busy === b.id} className="min-h-11 text-sm font-medium underline underline-offset-4 disabled:text-ink-soft">
                  {busy === b.id ? 'Quitando…' : 'Quitar'}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-ink-soft">No hay horarios bloqueados.</p>
      )}
      {failure ? <div className="mt-3"><Note title={networkMessage(failure).title}>No se quitó el bloqueo. Intenta de nuevo.</Note></div> : null}
    </section>
  )
}
