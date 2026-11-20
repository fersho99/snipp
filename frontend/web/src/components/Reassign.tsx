'use client'

import { useState } from 'react'
import { Button, Note } from './ui'
import { networkMessage, type ApiError } from '../services/auth'
import { proposalsFor, resolveAppointments, useStaffStore, type Decision, type ReassignMode, type ResolveResult, type StaffMember } from '../services/staff'
import { longDate, timeOfDay } from '../theme'

// Upcoming appointments of an Empleado who migrates (RF-W12) or is unlinked
// (RF-W13). For each one the system proposes another Empleado of the branch
// who is free at that time; the Jefe confirms or changes it (RN-11). With
// nobody free, a migrating Empleado keeps it by default; an unlinked one
// cannot, so it is cancelled. Every affected client is notified (RF-W16).
type ReassignProps = { employee: StaffMember; name: string; mode: ReassignMode; onDone: (r: ResolveResult) => void; onCancel?: () => void }
export default function Reassign({ employee, name, mode, onDone, onCancel }: ReassignProps) {
  const s = useStaffStore()
  const rows = proposalsFor(s, employee.id, mode)
  const [choice, setChoice] = useState<Record<string, Decision>>(() => Object.fromEntries(rows.map((r) => [r.appt.folio, r.proposal])))
  const [failure, setFailure] = useState<ApiError | null>(null)
  const [busy, setBusy] = useState(false)
  const first = name.split(' ')[0]
  const nameOf = (id: string) => s.profiles[s.staff[id]?.email]?.displayName ?? s.staff[id]?.name ?? ''

  const counts: Record<'otro' | 'mismo' | 'cancelar', number> = { otro: 0, mismo: 0, cancelar: 0 }
  for (const r of rows) {
    const c = choice[r.appt.folio]
    counts[c === 'mismo' || c === 'cancelar' ? c : 'otro']++
  }

  const confirm = async () => {
    setBusy(true)
    setFailure(null)
    try {
      const result = await resolveAppointments(employee.id, choice, mode)
      onDone(result)
    } catch (err) {
      setFailure(err as ApiError)
      setBusy(false)
    }
  }

  return (
    <div className="mt-3">
      {rows.length ? (
        <>
          <p className="max-w-prose text-ink-soft">
            Te proponemos a otro Empleado de la sucursal que esté libre a esa hora. Puedes cambiar cada propuesta.
            {mode === 'migracion' ? ` Si nadie está libre, por defecto la atiende ${first} para no afectar al cliente.` : ` Si nadie está libre, la cita se cancela, porque ${first} ya no podrá atenderla.`}
            {' '}Para reagendar una cita a otro día, hazlo desde la Agenda.
          </p>
          <ul className="mt-4">
            {rows.map(({ appt, free }) => {
              const value = choice[appt.folio]
              const id = `dec-${appt.folio}`
              return (
                <li key={appt.folio} className="flex flex-col gap-3 border-b border-divider py-4 last:border-0 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">{longDate(appt.start)}, {timeOfDay(appt.start)}</p>
                    <p className="text-sm text-ink-soft">{appt.service} · {appt.minutes} min · cita {appt.folio}</p>
                    {!free.length ? <p className="text-sm">Nadie más de la sucursal está libre a esa hora.</p> : null}
                  </div>
                  <div className="flex flex-col gap-1.5 md:w-80">
                    <label htmlFor={id} className="text-sm font-medium">Qué pasa con esta cita</label>
                    <select
                      id={id}
                      value={value}
                      onChange={(e) => setChoice((c) => ({ ...c, [appt.folio]: e.target.value }))}
                      className="min-h-11 rounded-control border-2 border-divider bg-sunken px-3 text-[15px] outline-none focus:border-ink-soft"
                    >
                      {free.map((fid) => <option key={fid} value={fid}>Pasarla a {nameOf(fid)} (libre)</option>)}
                      {mode === 'migracion' && !free.length ? <option value="mismo">La atiende {first}</option> : null}
                      <option value="cancelar">Cancelarla y avisar al cliente</option>
                    </select>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="mt-4 font-medium">
            {[
              counts.otro ? `${counts.otro} ${counts.otro === 1 ? 'pasa' : 'pasan'} a otro Empleado` : null,
              counts.mismo ? `${counts.mismo} ${counts.mismo === 1 ? 'se queda' : 'se quedan'} con ${first}` : null,
              counts.cancelar ? `${counts.cancelar} ${counts.cancelar === 1 ? 'se cancela' : 'se cancelan'}` : null,
            ].filter(Boolean).join(' · ')}
            . Cada cliente con un cambio recibe una notificación.
          </p>
        </>
      ) : (
        <p className="text-ink-soft">{first} no tiene citas agendadas a partir de hoy.</p>
      )}
      {failure ? <div className="mt-4"><Note title={networkMessage(failure).title}>No se guardaron los cambios. Intenta de nuevo.</Note></div> : null}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button onClick={confirm} loading={busy}>
          {mode === 'migracion' ? 'Confirmar' : `Desvincular a ${name}`}
        </Button>
        {onCancel ? <Button variant="secondary" onClick={onCancel}>Cancelar</Button> : null}
      </div>
    </div>
  )
}
