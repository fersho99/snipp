'use client'

import type { Branch, Business, WeekHours } from '../../types/domain'
import type { JoinRequest } from '../../data/demo'
import { useState } from 'react'
import Link from 'next/link'
import { useFlash } from '@/lib/navigation'
import { useBusinessPanel } from '@/components/PanelContext'
import { ArrowsLeftRight, EnvelopeSimple, UserPlus } from '@phosphor-icons/react'
import { Button, Note, TextField } from '../../components/ui'
import { StatusTag } from '../../components/status'
import { DEMO_TODAY } from '../../data/demo'
import { Avatar, ScheduleEditor } from '../../components/staff'
import { scheduleProblem, scheduleSummary } from '../../schedule'
import useAction from '@/lib/useAction'
import { acceptRequest, expiresOn, inviteEmployee, rejectRequest, useStaffStore } from '../../services/staff'
import { isEmail, longDate } from '../../theme'
import EmployeeDetail from './EmployeeDetail'

// Empleados (RF-W10 to RF-W13, RF-W17). `sub` = 'detalle' opens one Empleado.
export default function Employees({ sub }: { sub?: string }) {
  if (sub === 'detalle') return <EmployeeDetail />
  return <EmployeeList />
}

const DEFAULT_SCHEDULE: WeekHours = [null, ['10:00', '18:00'], ['10:00', '18:00'], ['10:00', '18:00'], ['10:00', '18:00'], ['10:00', '18:00'], ['10:00', '18:00']]

function EmployeeList() {
  const { business, branches } = useBusinessPanel()
  const s = useStaffStore()
  const flash = useFlash()
  const navState = flash ? { notice: flash } : null
  const staff = Object.values(s.staff).filter((e) => e.businessId === business.id)
  const requests = s.requests.filter((r) => r.businessId === business.id)
  const arrivals = s.arrivals.filter((r) => r.businessId === business.id)
  const invitations = s.invitations.filter((i) => i.businessId === business.id)
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? ''

  return (
    <div className="max-w-4xl">
      <h1 className="text-[28px] font-bold leading-tight">Empleados</h1>
      <p className="mt-1 max-w-prose text-ink-soft">Cada Empleado tiene su propia cuenta. Lo vinculas a una sucursal, por invitación o aceptando su solicitud, y le asignas su horario de trabajo.</p>

      <div className="mt-6 flex flex-col gap-3">
        {navState?.notice ? <Note tone="done" title={navState.notice.title}>{navState.notice.body}</Note> : null}
        {s.notices.map((n) => <Note key={n} tone="done" title={n} />)}
      </div>

      <Invite business={business} branches={branches} />

      {requests.length ? (
        <section className="mt-12" aria-labelledby="solicitudes">
          <h2 id="solicitudes" className="text-xl font-bold">Solicitudes por revisar <span className="tabular text-ink-soft">({requests.length})</span></h2>
          <ul className="mt-3">
            {requests.map((r) => <RequestRow key={r.id} request={r} branchName={branchName(r.branchId)} />)}
          </ul>
        </section>
      ) : null}

      {arrivals.length || invitations.length ? (
        <section className="mt-12" aria-labelledby="por-llegar">
          <h2 id="por-llegar" className="text-xl font-bold">Por llegar</h2>
          <ul className="mt-3">
            {arrivals.map((a) => (
              <li key={a.id} className="flex gap-3 border-b border-divider py-4 last:border-0">
                <ArrowsLeftRight size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">{a.name}, a {branchName(a.branchId)}</p>
                  <p className="text-sm text-ink-soft">Aceptaste su migración. Llega en cuanto termine sus citas en {a.from}; entonces aparece en la agenda con el horario que le asignaste.</p>
                </div>
              </li>
            ))}
            {invitations.map((i) => (
              <li key={i.id} className="flex gap-3 border-b border-divider py-4 last:border-0">
                <EnvelopeSimple size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">{i.email}, a {i.branchName}</p>
                  <p className="text-sm text-ink-soft">Invitación enviada el {longDate(i.sentOn)}. Aparece aquí como Empleado cuando la acepte.</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {branches.map((b) => {
        const people = staff.filter((e) => e.branchId === b.id)
        return (
          <section key={b.id} className="mt-12" aria-labelledby={`suc-${b.id}`}>
            <h2 id={`suc-${b.id}`} className="text-xl font-bold">{b.name} <span className="tabular text-ink-soft">({people.length})</span></h2>
            {people.length ? (
              <ul className="mt-3">
                {people.map((e) => {
                  const profile = s.profiles[e.email] ?? { displayName: e.name, specialties: [], photo: null }
                  return (
                    <li key={e.id} className="flex flex-col gap-3 border-b border-divider py-4 last:border-0 sm:flex-row sm:items-center sm:gap-5">
                      <div className="flex min-w-0 flex-1 gap-4">
                        <Avatar name={profile.displayName} photo={profile.photo} />
                        <div className="min-w-0">
                          <p className="font-semibold">{profile.displayName}</p>
                          {e.status === 'migracion-pendiente' ? (
                            <StatusTag
                              status={{ color: 'ambar', icon: 'atencion', label: `Migración pendiente a ${e.migration?.to ?? ''}${e.resolved ? '' : ': confirma quién toma sus citas'}` }}
                              className="my-0.5"
                            />
                          ) : null}
                          <p className="text-sm text-ink-soft">{profile.specialties.join(' · ') || 'Sin especialidades'}{e.bookable ? '' : ' · No recibe citas'}</p>
                          <p className="text-sm">{scheduleSummary(e.schedule)}</p>
                        </div>
                      </div>
                      <Link href={`/panel/empleados/${e.id}`} className="ml-16 shrink-0 font-medium underline underline-offset-4 sm:ml-0">
                        {e.status === 'migracion-pendiente' && !e.resolved ? 'Reasignar citas' : 'Ver perfil e historial'}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-3 text-ink-soft">Todavía no hay Empleados en esta sucursal. Sin Empleados no se pueden reservar citas en ella.</p>
            )}
          </section>
        )
      })}
    </div>
  )
}

// RF-W10: the invitation goes by email to the Empleado's own account.
function Invite({ business, branches }: { business: Business; branches: Branch[] }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const inviting = useAction({ busy: 'Enviando...', done: 'Invitación enviada', failed: 'No se pudo enviar' })
  const [sent, setSent] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEmail(email)) return setError('Escribe el correo completo del Empleado, por ejemplo nombre@gmail.com.')
    setError(null)
    const to = email.trim()
    inviting.run(() => inviteEmployee({ email, branchId, branchName: branches.find((b) => b.id === branchId)?.name ?? '', businessId: business.id, businessName: business.name }), {
      onDone: () => { setSent(to); setEmail(''); setOpen(false) },
    })
  }

  if (!branches.length) return null
  return (
    <div className="mt-6">
      {sent && !open ? <div className="mb-4"><Note tone="done" title={`Enviamos la invitación a ${sent}`}>Cuando la acepte desde su cuenta aparece en la lista con su horario.</Note></div> : null}
      {open ? (
        <form onSubmit={submit} noValidate className="flex max-w-2xl flex-col gap-5 rounded-control border border-divider bg-raised p-5">
          <p className="font-semibold">Invitar Empleado por correo</p>
          <TextField label="Correo del Empleado" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null) }} error={error} hint="Si todavía no tiene cuenta en SNIPP, el correo le explica cómo crearla." autoFocus />
          <div className="flex flex-col gap-2">
            <label htmlFor="invite-branch" className="text-[15px] font-medium">Sucursal</label>
            <select id="invite-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)} className="min-h-12 rounded-control border-2 border-divider bg-sunken px-3 text-base outline-none focus:border-ink-soft">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <Button type="submit" {...inviting.button}>Enviar invitación</Button>
            <Button type="button" variant="secondary" disabled={inviting.busy} onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => { setOpen(true); setSent(null) }}>
          <UserPlus size={18} aria-hidden="true" />
          Invitar Empleado
        </Button>
      )}
    </div>
  )
}

// SRS v1.2, 4.2.2 "Empleados: solicitudes": migration requests show in amber
// how many days are left before they expire (RF-W12).
function daysLeftLabel(sentOn: Date) {
  const days = Math.max(0, Math.ceil((expiresOn(sentOn).getTime() - DEMO_TODAY.getTime()) / 86_400_000))
  return days === 0 ? 'Caduca hoy' : days === 1 ? 'Falta 1 día para que caduque' : `Faltan ${days} días para que caduque`
}

function RequestRow({ request: r, branchName }: { request: JoinRequest; branchName: string }) {
  const [accepting, setAccepting] = useState(false)
  const [schedule, setSchedule] = useState<WeekHours>(DEFAULT_SCHEDULE)
  const [error, setError] = useState<string | null>(null)
  const acceptAction = useAction({ busy: 'Aceptando...', done: 'Aceptado', failed: 'No se pudo aceptar' })
  const rejecting = useAction({ busy: 'Rechazando...', done: 'Rechazada', failed: 'No se pudo rechazar' })
  const isMigration = r.kind === 'migracion'

  const accept = () => {
    const problem = scheduleProblem(schedule)
    if (problem) return setError(problem)
    acceptAction.run(() => acceptRequest(r.id, schedule), {
      success: isMigration ? `Aceptaste la migración de ${r.name}. Llega cuando termine su última cita en su negocio actual.` : `Aceptaste a ${r.name}. Ya aparece en Empleados con su horario.`,
    })
  }
  const reject = () => rejecting.run(() => rejectRequest(r.id), { success: `Rechazaste la solicitud de ${r.name}.` })

  return (
    <li className="border-b border-divider py-4 last:border-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          {isMigration ? <ArrowsLeftRight size={22} className="mt-0.5 shrink-0" aria-hidden="true" /> : <UserPlus size={22} className="mt-0.5 shrink-0" aria-hidden="true" />}
          <div>
            <p className="font-semibold">{isMigration ? `${r.name} pide migrar de ${r.from} a ${branchName}` : `${r.name} pide unirse a ${branchName}`}</p>
            <p className="text-sm text-ink-soft">
              Enviada el {longDate(r.sentOn)}{isMigration ? ` · caduca el ${longDate(expiresOn(r.sentOn))} si no respondes` : ''}
            </p>
            {isMigration ? <StatusTag status={{ color: 'ambar', icon: 'reloj', label: daysLeftLabel(r.sentOn) }} className="mt-1" /> : null}
          </div>
        </div>
        {!accepting ? (
          <div className="ml-[34px] flex shrink-0 gap-3 sm:ml-0">
            <Button onClick={() => setAccepting(true)} disabled={rejecting.busy}>Aceptar</Button>
            <Button variant="secondary" {...rejecting.button} onClick={reject}>Rechazar</Button>
          </div>
        ) : null}
      </div>
      {accepting ? (
        <div className="mt-5 rounded-control border border-divider bg-raised p-5">
          <p className="font-semibold">Horario de trabajo de {r.name} en {branchName}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {isMigration
              ? `Llega cuando termine sus citas en ${r.from}; desde entonces la app ofrece citas con él en este horario.`
              : 'La app ofrece citas con este Empleado solo en este horario.'}
          </p>
          <div className="mt-4">
            <ScheduleEditor value={schedule} onChange={(v) => { setSchedule(v); setError(null) }} error={error} />
          </div>
          <div className="mt-5 flex gap-3">
            <Button {...acceptAction.button} onClick={accept}>Aceptar y vincular</Button>
            <Button variant="secondary" disabled={acceptAction.busy} onClick={() => setAccepting(false)}>Cancelar</Button>
          </div>
        </div>
      ) : null}
    </li>
  )
}
