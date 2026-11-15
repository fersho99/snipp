// Pieces shared by the Jefe's and the Empleado's pages of batch W5.
import { useMemo, useState } from 'react'
import { Checkbox } from './ui'
import { historyFor } from '../data/staff'
import { useStaffStore } from '../services/staff'
import { count, dayMonth, timeOfDay } from '../theme'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function Avatar({ name, photo, size = 48 }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return photo ? (
    <img src={photo} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-sunken font-title font-bold text-ink-soft" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">
      {initials}
    </span>
  )
}

// Work schedule (RF-W10): the days and hours the Empleado can take appointments.
export function ScheduleEditor({ value, onChange, error }) {
  const setDay = (d, v) => onChange(value.map((h, i) => (i === d ? v : h)))
  return (
    <div>
      <div className="flex max-w-2xl flex-col">
        {WEEK_ORDER.map((d) => {
          const h = value[d]
          return (
            <div key={d} className="flex min-h-14 flex-wrap items-center gap-x-5 gap-y-2 border-b border-divider py-2 last:border-0">
              <Checkbox className="w-36" label={DAY_NAMES[d]} checked={!!h} onChange={(e) => setDay(d, e.target.checked ? ['10:00', '18:00'] : null)} />
              {h ? (
                <div className="flex items-center gap-2">
                  <TimeInput label={`Entrada el ${DAY_NAMES[d].toLowerCase()}`} value={h[0]} onChange={(v) => setDay(d, [v, h[1]])} />
                  <span aria-hidden="true">a</span>
                  <TimeInput label={`Salida el ${DAY_NAMES[d].toLowerCase()}`} value={h[1]} onChange={(v) => setDay(d, [h[0], v])} />
                </div>
              ) : (
                <span className="text-ink-soft">Descansa</span>
              )}
            </div>
          )
        })}
      </div>
      {error ? <p className="mt-3 text-sm font-medium" role="alert">{error}</p> : null}
    </div>
  )
}

function TimeInput({ label, value, onChange }) {
  return (
    <input
      type="time"
      aria-label={label}
      value={value}
      step={900}
      onChange={(e) => onChange(e.target.value)}
      className="tabular min-h-11 rounded-control border-2 border-transparent bg-sunken px-3 text-[15px] outline-none focus:border-ink-soft focus:bg-raised"
    />
  )
}

const ACTION = { confirmada: 'Confirmada', cancelada: 'Cancelada', reagendada: 'Reagendada' }
const PAGE = 15

// Appointment history of one Empleado (RF-W17): how many were confirmed,
// cancelled and rescheduled, and each action with its date and who did it.
// `self` is true when the Empleado looks at their own history.
export function History({ employeeId, self = false }) {
  const generated = useMemo(() => historyFor(employeeId), [employeeId])
  const { log } = useStaffStore()
  const events = useMemo(() => [...log.filter((e) => e.employeeId === employeeId).reverse(), ...generated], [log, employeeId, generated])
  const [filter, setFilter] = useState('todas')
  const [shown, setShown] = useState(PAGE)
  const totals = { confirmada: 0, cancelada: 0, reagendada: 0 }
  for (const e of events) totals[e.action]++
  const list = filter === 'todas' ? events : events.filter((e) => e.action === filter)
  const who = (by) => (by === 'Empleado' ? (self ? 'Tú' : 'Empleado') : by === 'Jefe' ? 'Jefe' : 'Cliente')

  if (!events.length) return <p className="text-ink-soft">Todavía no hay citas en este historial.</p>

  return (
    <div>
      <div className="grid max-w-xl grid-cols-3 gap-6">
        {[['confirmada', 'Confirmadas'], ['cancelada', 'Canceladas'], ['reagendada', 'Reagendadas']].map(([k, label]) => (
          <div key={k} className="border-l-[3px] border-ink pl-3">
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="tabular font-title text-[28px] font-bold leading-tight">{totals[k]}</p>
          </div>
        ))}
      </div>

      <div role="radiogroup" aria-label="Filtrar historial" className="mt-6 inline-flex flex-wrap gap-1 rounded-control bg-sunken p-1">
        {[['todas', 'Todas'], ['confirmada', 'Confirmadas'], ['cancelada', 'Canceladas'], ['reagendada', 'Reagendadas']].map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={filter === k}
            onClick={() => { setFilter(k); setShown(PAGE) }}
            className={`min-h-10 rounded-[8px] px-3.5 text-[15px] ${filter === k ? 'bg-raised font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.08)]' : 'text-ink-soft hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[15px]">
          <thead>
            <tr className="border-b border-divider text-sm text-ink-soft">
              <th scope="col" className="py-2.5 pr-4 font-medium">Fecha</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Cita</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Servicio</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Acción</th>
              <th scope="col" className="py-2.5 pl-3 font-medium">Quién</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, shown).map((e) => (
              <tr key={e.id} className="border-b border-divider last:border-0">
                <td className="tabular py-2.5 pr-4">{dayMonth(e.on)}, {timeOfDay(e.on)}</td>
                <td className="tabular px-3 py-2.5">{e.folio}</td>
                <td className="px-3 py-2.5">{e.service}</td>
                <td className="px-3 py-2.5 font-medium">{ACTION[e.action]}</td>
                <td className="py-2.5 pl-3">{who(e.by)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-ink-soft">
        {list.length > shown ? `Mostrando ${shown} de ${count(list.length, 'acción', 'acciones')}.` : count(list.length, 'acción', 'acciones')}
      </p>
      {list.length > shown ? (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-2 min-h-11 font-medium underline underline-offset-4">Ver más</button>
      ) : null}
    </div>
  )
}
