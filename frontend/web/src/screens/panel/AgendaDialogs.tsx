'use client'

import { useMemo, useState } from 'react'
import { FieldError, Button, Dialog, Note, TextField } from '../../components/ui'
import useAction, { type ActionButton } from '@/lib/useAction'
import { markChanged } from '@/lib/flash'
import { apptStatus } from './agendaIcons'
import { StatusTag } from '../../components/status'
import { DEMO_TODAY } from '../../data/demo'
import {
  addBlock, appointmentsInside, cancelAll, canManage, freeTimes, hasStarted, needsStarted, reassign, reassignAll, reschedule, SETTABLE, setStatus, STATUS,
} from '../../services/agenda'
import { getStaffStore, isFree, isUpcoming, useStaffStore } from '../../services/staff'
import { fromInputDate, longDate, timeOfDay, toInputDate } from '../../theme'
import type { Appointment, AppointmentStatus, Branch, Session } from '../../types/domain'
import type { StaffMember, StaffState } from '../../services/staff'

type NameOf = (id: string) => string
type Notice = { title: string; body: string }

const selectCls = 'min-h-11 w-full rounded-control border-2 border-divider bg-sunken px-3 text-[15px] outline-none focus:border-ink-soft'
const FIELD = 'flex flex-col gap-1.5'

// One appointment: details and, for whoever may manage it (RN-03), change
// its status (RF-W18), reschedule it (RF-W18), move it to another Empleado
// (Jefe only, RF-W16) or cancel it. The client is notified of every change.
export function AppointmentDialog({ session, appt, nameOf, onClose }: { session: Session; appt: Appointment; nameOf: NameOf; onClose: () => void }) {
  const s = useStaffStore()
  const manage = canManage(session, appt)
  const isJefe = session.role === 'jefe'
  const [mode, setMode] = useState<'estado' | 'reagendar' | 'reasignar' | 'cancelar' | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const active = isUpcoming(appt)
  const first = appt.client.split(' ')[0]
  // RNF-W07: loading, then green or red, for each way of changing the appointment.
  const action = useAction(ACTION_LABELS[mode ?? 'estado'])

  // On closing, the block that changed is highlighted with its new color.
  const close = () => {
    if (done) markChanged(appt.folio)
    onClose()
  }

  const run = (fn: () => Promise<unknown>, message: string) =>
    action.run(fn, { onDone: () => { setDone(message); setMode(null) } })

  return (
    <Dialog
      open
      onClose={close}
      title={`${appt.service} con ${nameOf(appt.employeeId)}`}
      actions={<Button variant="secondary" onClick={close}>Cerrar</Button>}
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-[15px]">
        <dt className="text-ink-soft">Cuándo</dt>
        <dd>{longDate(appt.start)}, {timeOfDay(appt.start)} · {appt.minutes} min</dd>
        <dt className="text-ink-soft">Cliente</dt>
        <dd>{appt.client}</dd>
        <dt className="text-ink-soft">Cita</dt>
        <dd className="tabular">{appt.folio}</dd>
        <dt className="text-ink-soft">Estado</dt>
        <dd>
          <StatusTag status={{ ...apptStatus(appt.status), label: `${STATUS[appt.status]}${appt.status === 'cancelada' && appt.cancelledBy ? ` (por ${appt.cancelledBy === 'cliente' ? 'el cliente' : `el ${appt.cancelledBy}`})` : ''}` }} />
        </dd>
      </dl>
      {appt.status === 'cambio' ? <p className="text-sm">Le avisamos del cambio a {first}; puede aceptarlo, reagendar o cancelar desde la app.</p> : null}

      {done ? <Note tone="done" title={done}>Le avisamos a {first} por notificación.</Note> : null}

      {!manage ? (
        <p className="text-sm text-ink-soft">Solo puedes gestionar tus propias citas.</p>
      ) : mode === 'estado' ? (
        <StatusForm appt={appt} action={action.button} onCancel={() => setMode(null)} onSave={(st) => run(() => setStatus(session, appt.folio, st), `La cita quedó como «${STATUS[st]}».`)} />
      ) : mode === 'reagendar' ? (
        <RescheduleForm store={s} appt={appt} action={action.button} onCancel={() => setMode(null)} onSave={(at) => run(() => reschedule(session, appt.folio, at), `Reagendaste la cita al ${longDate(at)}, ${timeOfDay(at)}.`)} />
      ) : mode === 'reasignar' ? (
        <ReassignForm store={s} appt={appt} nameOf={nameOf} action={action.button} onCancel={() => setMode(null)} onSave={(id) => run(() => reassign(appt.folio, id), `La cita pasó a ${nameOf(id)}.`)} />
      ) : mode === 'cancelar' ? (
        <div className="flex flex-col gap-3 rounded-control bg-sunken p-4">
          <p className="font-semibold">¿Cancelar la cita de {first}?</p>
          <p className="text-sm">El horario queda libre en la app y {first} recibe el aviso.</p>
          <div className="flex gap-3">
            <Button {...action.button} onClick={() => run(() => setStatus(session, appt.folio, 'cancelada'), 'Cancelaste la cita.')}>Sí, cancelar</Button>
            <Button variant="secondary" onClick={() => setMode(null)} disabled={action.busy}>No</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
          <button type="button" className="min-h-11 font-medium underline underline-offset-4" onClick={() => { setMode('estado'); setDone(null) }}>Cambiar estado</button>
          {active ? <button type="button" className="min-h-11 font-medium underline underline-offset-4" onClick={() => { setMode('reagendar'); setDone(null) }}>Reagendar</button> : null}
          {active && isJefe ? <button type="button" className="min-h-11 font-medium underline underline-offset-4" onClick={() => { setMode('reasignar'); setDone(null) }}>Pasar a otro Empleado</button> : null}
          {active ? <button type="button" className="min-h-11 font-medium underline underline-offset-4" onClick={() => { setMode('cancelar'); setDone(null) }}>Cancelar cita</button> : null}
        </div>
      )}
    </Dialog>
  )
}

const ACTION_LABELS = {
  estado: { busy: 'Guardando...', done: 'Estado guardado', failed: 'No se pudo guardar' },
  reagendar: { busy: 'Reagendando...', done: 'Cita reagendada', failed: 'No se pudo reagendar' },
  reasignar: { busy: 'Pasando la cita...', done: 'Cita reasignada', failed: 'No se pudo reasignar' },
  cancelar: { busy: 'Cancelando...', done: 'Cita cancelada', failed: 'No se pudo cancelar' },
}

type FormProps = { appt: Appointment; action: ActionButton; onCancel: () => void }
function StatusForm({ appt, action, onSave, onCancel }: FormProps & { onSave: (st: AppointmentStatus) => void }) {
  const [value, setValue] = useState<AppointmentStatus>(appt.status === 'cambio' ? 'confirmada' : appt.status)
  const started = hasStarted(appt)
  return (
    <div className="flex flex-col gap-3 rounded-control bg-sunken p-4">
      <div className={FIELD}>
        <label htmlFor="estado-cita" className="text-sm font-medium">Estado</label>
        <select id="estado-cita" value={value} onChange={(e) => setValue(e.target.value as AppointmentStatus)} className={`${selectCls} bg-raised`}>
          {SETTABLE.map((st) => (
            <option key={st} value={st} disabled={needsStarted(st) && !started}>{STATUS[st]}{needsStarted(st) && !started ? ' (cuando empiece la cita)' : ''}</option>
          ))}
        </select>
      </div>
      {!started ? <p className="text-sm">«Atendida», «No asistió» y «Empleado no se presentó» se marcan cuando llega la hora de la cita.</p> : null}
      <div className="flex gap-3">
        <Button {...action} onClick={() => onSave(value)} disabled={value === appt.status}>Guardar estado</Button>
        <Button variant="secondary" onClick={onCancel} disabled={action.loading || !!action.result}>Cancelar</Button>
      </div>
    </div>
  )
}

// RF-W18: the business reschedules without the clients' minimum notice;
// only free times of that Empleado are offered (RN-01).
function RescheduleForm({ store, appt, action, onSave, onCancel }: FormProps & { store: StaffState; onSave: (at: Date) => void }) {
  const [day, setDay] = useState(toInputDate(appt.start < DEMO_TODAY ? DEMO_TODAY : appt.start))
  const date = fromInputDate(day)
  const times = useMemo(() => (date ? freeTimes(store, appt, appt.employeeId, date) : []), [store, appt, date])
  const [time, setTime] = useState('')
  const chosen = times.find((t) => t.toISOString() === time)
  return (
    <div className="flex flex-col gap-3 rounded-control bg-sunken p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={FIELD}>
          <label htmlFor="re-dia" className="text-sm font-medium">Día</label>
          <input id="re-dia" type="date" min={toInputDate(DEMO_TODAY)} value={day} onChange={(e) => { setDay(e.target.value); setTime('') }} className={`${selectCls} bg-raised tabular`} />
        </div>
        <div className={FIELD}>
          <label htmlFor="re-hora" className="text-sm font-medium">Hora libre</label>
          <select id="re-hora" value={time} onChange={(e) => setTime(e.target.value)} disabled={!times.length} className={`${selectCls} bg-raised`}>
            <option value="">{times.length ? 'Elige una hora' : 'Sin horas libres'}</option>
            {times.map((t) => <option key={t.toISOString()} value={t.toISOString()}>{timeOfDay(t)}</option>)}
          </select>
        </div>
      </div>
      {!times.length && date ? <p className="text-sm">Ese día el Empleado no trabaja, está bloqueado o ya no tiene horas libres para {appt.minutes} minutos.</p> : null}
      <div className="flex gap-3">
        <Button {...action} onClick={() => chosen && onSave(chosen)} disabled={!chosen}>Reagendar</Button>
        <Button variant="secondary" onClick={onCancel} disabled={action.loading || !!action.result}>Cancelar</Button>
      </div>
    </div>
  )
}

// RF-W16: one appointment to another Empleado free at that time.
function ReassignForm({ store, appt, nameOf, action, onSave, onCancel }: FormProps & { store: StaffState; nameOf: NameOf; onSave: (id: string) => void }) {
  const free = Object.keys(store.staff).filter((id) => id !== appt.employeeId && isFree(store, id, appt))
  const [to, setTo] = useState(free[0] ?? '')
  return (
    <div className="flex flex-col gap-3 rounded-control bg-sunken p-4">
      {free.length ? (
        <div className={FIELD}>
          <label htmlFor="re-empleado" className="text-sm font-medium">Pasar a</label>
          <select id="re-empleado" value={to} onChange={(e) => setTo(e.target.value)} className={`${selectCls} bg-raised`}>
            {free.map((id) => <option key={id} value={id}>{nameOf(id)} (libre a esa hora)</option>)}
          </select>
        </div>
      ) : (
        <p className="text-sm">Nadie más de la sucursal está libre a esa hora. Puedes reagendarla o cancelarla.</p>
      )}
      <div className="flex gap-3">
        <Button {...action} onClick={() => onSave(to)} disabled={!to}>Pasar cita</Button>
        <Button variant="secondary" onClick={onCancel} disabled={action.loading || !!action.result}>Cancelar</Button>
      </div>
    </div>
  )
}

// RF-W16: every upcoming appointment of one Empleado to another.
export function BulkReassignDialog({ from, people, nameOf, onClose, onDone }: { from: StaffMember; people: StaffMember[]; nameOf: NameOf; onClose: () => void; onDone: (n: Notice) => void }) {
  const s = useStaffStore()
  const targets = people.filter((e) => e.id !== from.id && e.status === 'activo')
  const [to, setTo] = useState(targets[0]?.id ?? '')
  const action = useAction({ busy: 'Reasignando...', done: 'Citas reasignadas', failed: 'No se pudo reasignar' })
  const list = s.appointments.filter((a) => a.employeeId === from.id && isUpcoming(a)).sort((a, b) => a.start.getTime() - b.start.getTime())

  // Preview: walk them in order, as the API does, so two can't take the same slot.
  const preview = useMemo(() => {
    if (!to) return { ok: 0, conflicts: list }
    let work = s
    const conflicts = []
    let ok = 0
    for (const a of list) {
      if (isFree(work, to, a)) {
        ok++
        work = { ...work, appointments: work.appointments.map((x) => (x.folio === a.folio ? { ...x, employeeId: to } : x)) }
      } else conflicts.push(a)
    }
    return { ok, conflicts }
  }, [s, to, list])

  const confirm = () => action.run(() => reassignAll(from.id, to), {
    onDone: (r) => onDone({
      title: `${r.moved} ${r.moved === 1 ? 'cita pasó' : 'citas pasaron'} de ${nameOf(from.id)} a ${nameOf(to)}`,
      body: `Cada cliente recibió el aviso.${r.conflicts.length ? ` ${r.conflicts.length} ${r.conflicts.length === 1 ? 'se quedó' : 'se quedaron'} con ${nameOf(from.id)} porque ${nameOf(to)} no está libre a esa hora; cámbialas una por una.` : ''}`,
    }),
  })

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Reasignar las citas futuras de ${nameOf(from.id)}`}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={action.busy}>Cancelar</Button>
          <Button {...action.button} onClick={confirm} disabled={!to || !preview.ok}>Reasignar {preview.ok || ''}</Button>
        </>
      }
    >
      {!list.length ? <p>{nameOf(from.id)} no tiene citas futuras.</p> : !targets.length ? <p>No hay otro Empleado en la sucursal que pueda recibirlas.</p> : (
        <>
          <p>{list.length === 1 ? 'Tiene 1 cita futura.' : `Tiene ${list.length} citas futuras.`}</p>
          <div className={FIELD}>
            <label htmlFor="bulk-to" className="text-sm font-medium">Pasarlas a</label>
            <select id="bulk-to" value={to} onChange={(e) => setTo(e.target.value)} className={selectCls}>
              {targets.map((e) => <option key={e.id} value={e.id}>{nameOf(e.id)}</option>)}
            </select>
          </div>
          <p className="font-medium">{preview.ok} de {list.length} pueden pasar a {nameOf(to)}.</p>
          {preview.conflicts.length ? (
            <div className="text-sm">
              <p>Se quedan con {nameOf(from.id)}, porque {nameOf(to)} no trabaja, está bloqueado o ya tiene cita a esa hora:</p>
              <ul className="mt-1 list-disc pl-5">
                {preview.conflicts.slice(0, 6).map((a) => <li key={a.folio}>{longDate(a.start)}, {timeOfDay(a.start)} · {a.service}</li>)}
                {preview.conflicts.length > 6 ? <li>y {preview.conflicts.length - 6} más</li> : null}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </Dialog>
  )
}

export function BulkCancelDialog({ from, nameOf, onClose, onDone }: { from: StaffMember; nameOf: NameOf; onClose: () => void; onDone: (n: Notice) => void }) {
  const s = useStaffStore()
  const n = s.appointments.filter((a) => a.employeeId === from.id && isUpcoming(a)).length
  const action = useAction({ busy: 'Cancelando...', done: 'Citas canceladas', failed: 'No se pudo cancelar' })
  const confirm = () => action.run(() => cancelAll(from.id), {
    onDone: (c) => onDone({ title: `Cancelaste ${c === 1 ? '1 cita' : `${c} citas`} de ${nameOf(from.id)}`, body: 'Cada cliente recibió el aviso y los horarios quedaron libres en la app.' }),
  })
  return (
    <Dialog
      open
      onClose={onClose}
      title={`¿Cancelar todas las citas futuras de ${nameOf(from.id)}?`}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={action.busy}>No</Button>
          <Button {...action.button} onClick={confirm} disabled={!n}>Sí, cancelar {n}</Button>
        </>
      }
    >
      <p>{n ? `Se cancelan ${n === 1 ? '1 cita' : `${n} citas`} y cada cliente recibe una notificación. No se puede deshacer.` : `${nameOf(from.id)} no tiene citas futuras.`}</p>
      <p className="text-sm text-ink-soft">Si alguien más puede atenderlas, mejor reasígnalas.</p>
    </Dialog>
  )
}

// RF-W15: block a few hours or several days for one Empleado.
export function BlockDialog({ session, branch, people, nameOf, onClose, onDone }: { session: Session; branch: Branch; people: StaffMember[]; nameOf: NameOf; onClose: () => void; onDone: (n: Notice) => void }) {
  const today = toInputDate(DEMO_TODAY)
  const [employeeId, setEmployeeId] = useState(people[0]?.id ?? '')
  const [kind, setKind] = useState('horas')
  const [form, setForm] = useState({ day: today, from: '14:00', to: '15:00', fromDay: today, toDay: today, reason: 'Descanso', other: '' })
  const [error, setError] = useState<string | null>(null)
  const action = useAction({ busy: 'Bloqueando...', done: 'Horario bloqueado', failed: 'No se pudo bloquear' })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError(null) }

  const range = () => {
    if (kind === 'horas') {
      const d = fromInputDate(form.day)
      if (!d || !form.from || !form.to) return null
      const [fh, fm] = form.from.split(':').map(Number)
      const [th, tm] = form.to.split(':').map(Number)
      return [new Date(d.getFullYear(), d.getMonth(), d.getDate(), fh, fm), new Date(d.getFullYear(), d.getMonth(), d.getDate(), th, tm)]
    }
    const a = fromInputDate(form.fromDay)
    const b = fromInputDate(form.toDay)
    return a && b ? [a, new Date(b.getFullYear(), b.getMonth(), b.getDate(), 23, 59)] : null
  }
  const r = range()
  const inside = r && employeeId && r[1] > r[0] ? appointmentsInside(getStaffStore(), employeeId, r[0], r[1]) : []

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const reason = form.reason === 'Otro' ? form.other.trim() : form.reason
    if (!r) return setError('Completa las fechas y las horas.')
    if (r[1] <= r[0]) return setError(kind === 'horas' ? 'La hora final debe ser después de la inicial.' : 'El último día debe ser igual o posterior al primero.')
    if (r[1] < DEMO_TODAY) return setError('Ese horario ya pasó.')
    if (!reason) return setError('Escribe el motivo, por ejemplo «Curso».')
    const [from, to] = r
    action.run(() => addBlock({ employeeId, branchId: branch.id, from, to, reason }), {
      onDone: () => onDone({
        title: `Bloqueaste el horario de ${nameOf(employeeId)}`,
        body: `La app ya no ofrece citas en ese horario.${inside.length === 1 ? ' La cita que ya estaba agendada sigue en pie; reasígnala o cancélala desde la agenda.' : inside.length ? ` Las ${inside.length} citas que ya estaban agendadas siguen en pie; reasígnalas o cancélalas desde la agenda.` : ''}`,
      }),
    })
  }

  const input = `${selectCls} tabular`
  return (
    <Dialog
      open
      onClose={onClose}
      title="Bloquear horario"
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={action.busy}>Cancelar</Button>
          <Button {...action.button} onClick={submit}>Bloquear</Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {session.role === 'jefe' ? (
          <div className={FIELD}>
            <label htmlFor="b-emp" className="text-sm font-medium">Empleado</label>
            <select id="b-emp" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={selectCls}>
              {people.map((e) => <option key={e.id} value={e.id}>{nameOf(e.id)}</option>)}
            </select>
          </div>
        ) : null}
        <div role="radiogroup" aria-label="Qué bloquear" className="inline-flex gap-1 self-start rounded-control bg-sunken p-1">
          {[['horas', 'Unas horas'], ['dias', 'Días completos']].map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => { setKind(k); setError(null) }} className={`min-h-9 rounded-[8px] px-3.5 text-[15px] ${kind === k ? 'bg-raised font-semibold' : 'text-ink-soft'}`}>{label}</button>
          ))}
        </div>
        {kind === 'horas' ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={FIELD}><label htmlFor="b-day" className="text-sm font-medium">Día</label><input id="b-day" type="date" min={today} value={form.day} onChange={set('day')} className={input} /></div>
            <div className={FIELD}><label htmlFor="b-from" className="text-sm font-medium">Desde</label><input id="b-from" type="time" step={900} value={form.from} onChange={set('from')} className={input} /></div>
            <div className={FIELD}><label htmlFor="b-to" className="text-sm font-medium">Hasta</label><input id="b-to" type="time" step={900} value={form.to} onChange={set('to')} className={input} /></div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={FIELD}><label htmlFor="b-fd" className="text-sm font-medium">Primer día</label><input id="b-fd" type="date" min={today} value={form.fromDay} onChange={set('fromDay')} className={input} /></div>
            <div className={FIELD}><label htmlFor="b-td" className="text-sm font-medium">Último día</label><input id="b-td" type="date" min={today} value={form.toDay} onChange={set('toDay')} className={input} /></div>
          </div>
        )}
        <div className={FIELD}>
          <label htmlFor="b-reason" className="text-sm font-medium">Motivo</label>
          <select id="b-reason" value={form.reason} onChange={set('reason')} className={selectCls}>
            {['Descanso', 'Vacaciones', 'Otro'].map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        {form.reason === 'Otro' ? <TextField label="¿Cuál?" maxLength={60} value={form.other} onChange={set('other')} placeholder="Por ejemplo: Curso" /> : null}
        {inside.length ? (
          <p className="text-sm font-medium">
            {nameOf(employeeId)} ya tiene {inside.length === 1 ? '1 cita en ese horario. Bloquearlo no la cancela: después reasígnala o cancélala.' : `${inside.length} citas en ese horario. Bloquearlo no las cancela: después reasígnalas o cancélalas.`}
          </p>
        ) : null}
        {error ? <FieldError>{error}</FieldError> : null}
      </form>
    </Dialog>
  )
}
