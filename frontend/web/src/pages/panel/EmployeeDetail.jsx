import { useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router'
import { ArrowLeft, ArrowsLeftRight } from '@phosphor-icons/react'
import { Button, Note } from '../../components/ui'
import { Avatar, History, ScheduleEditor } from '../../components/staff'
import Reassign from '../../components/Reassign'
import { scheduleProblem, scheduleSummary } from '../../schedule'
import { networkMessage } from '../../services/auth'
import { lastAppointmentOf, saveSchedule, useStaffStore } from '../../services/staff'
import { longDate, timeOfDay } from '../../theme'

// One Empleado as the Jefe sees it: profile (the Empleado edits it, RF-W11),
// work schedule (RF-W10), appointment history (RF-W17), and the two ways an
// Empleado leaves: migration (RF-W12) and unlinking (RF-W13).
export default function EmployeeDetail() {
  const { employeeId } = useParams()
  const { business, branches } = useOutletContext()
  const s = useStaffStore()
  const navigate = useNavigate()
  const e = s.staff[employeeId]
  const [unlinking, setUnlinking] = useState(false)

  if (!e || e.businessId !== business.id) {
    return (
      <div className="max-w-xl">
        <BackLink />
        <h1 className="mt-6 text-[28px] font-bold leading-tight">No encontramos a este Empleado</h1>
        <p className="mt-2">Puede que ya no esté vinculado a {business.name} o que la dirección esté mal escrita.</p>
      </div>
    )
  }

  const profile = s.profiles[e.email] ?? { displayName: e.name, specialties: [], photo: null }
  const branch = branches.find((b) => b.id === e.branchId)
  const migrating = e.status === 'migracion-pendiente'
  const last = lastAppointmentOf(s, e.id)

  return (
    <div className="max-w-4xl">
      <BackLink />
      <div className="mt-6 flex items-center gap-5">
        <Avatar name={profile.displayName} photo={profile.photo} size={72} />
        <div>
          <h1 className="text-[28px] font-bold leading-tight">{profile.displayName}</h1>
          <p className="text-ink-soft">{branch?.name} · {e.email}</p>
        </div>
      </div>
      <p className="mt-4">{profile.specialties.length ? profile.specialties.join(' · ') : 'Sin especialidades'}{e.bookable ? '' : ' · No recibe citas'}</p>
      <p className="mt-1 text-sm text-ink-soft">La foto, el nombre visible y las especialidades los edita el Empleado desde su cuenta.</p>

      {migrating ? (
        <section className="mt-10" aria-labelledby="migracion">
          <div className="flex gap-3 rounded-control bg-sunken px-5 py-4">
            <ArrowsLeftRight size={22} weight="bold" className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <h2 id="migracion" className="font-semibold">Migración pendiente a {e.migration.to}</h2>
              <p className="text-sm">
                {e.migration.to} aceptó su solicitud el {longDate(e.migration.acceptedOn)}. Desde entonces ya nadie puede reservar nuevas citas con {profile.displayName.split(' ')[0]}.
                {last ? ` Se va cuando termine su última cita (${longDate(last.start)}, ${timeOfDay(last.start)}) o cuando no le quede ninguna.` : ''}
              </p>
            </div>
          </div>
          {!e.resolved ? (
            <div className="mt-6">
              <h3 className="text-lg font-semibold">¿Quién toma sus citas?</h3>
              <Reassign
                employee={e}
                name={profile.displayName}
                mode="migracion"
                onDone={(r) => { if (r.done) navigate('/panel/empleados', { replace: true }) }}
              />
            </div>
          ) : (
            <p className="mt-4">Ya confirmaste quién toma cada cita y cada cliente con un cambio recibió el aviso.</p>
          )}
        </section>
      ) : null}

      <Schedule employee={e} />

      <section className="mt-14" aria-labelledby="historial">
        <h2 id="historial" className="text-xl font-bold">Historial de citas</h2>
        <p className="mt-1 mb-5 text-ink-soft">Citas confirmadas, canceladas y reagendadas, con la fecha y quién hizo cada cambio. Se quedan en {business.name} aunque el Empleado se vaya.</p>
        {e.bookable ? <History employeeId={e.id} /> : <p className="text-ink-soft">{profile.displayName.split(' ')[0]} no recibe citas, así que no tiene historial de citas.</p>}
      </section>

      {!migrating ? (
        <section className="mt-16 border-t border-divider pt-8" aria-labelledby="desvincular">
          <h2 id="desvincular" className="text-lg font-semibold">Desvincular de {business.name}</h2>
          <p className="mt-1 max-w-prose">
            {profile.displayName.split(' ')[0]} deja de aparecer en la agenda y en la app. Su cuenta sigue activa y puede unirse a otro negocio; su historial y sus reseñas se quedan aquí.
          </p>
          {unlinking ? (
            <div className="mt-6">
              <h3 className="text-lg font-semibold">Antes, decide qué pasa con sus citas</h3>
              <Reassign
                employee={e}
                name={profile.displayName}
                mode="desvincular"
                onCancel={() => setUnlinking(false)}
                onDone={(r) =>
                  navigate('/panel/empleados', {
                    replace: true,
                    state: {
                      notice: {
                        title: `Desvinculaste a ${profile.displayName}`,
                        body: `${r.reassigned ? `${r.reassigned} ${r.reassigned === 1 ? 'cita pasó' : 'citas pasaron'} a otro Empleado. ` : ''}${r.cancelled ? `${r.cancelled} ${r.cancelled === 1 ? 'cita se canceló' : 'citas se cancelaron'} y cada cliente recibió el aviso. ` : ''}Su cuenta sigue activa y puede unirse a otro negocio.`,
                      },
                    },
                  })
                }
              />
            </div>
          ) : (
            <Button variant="secondary" className="mt-4" onClick={() => setUnlinking(true)}>Desvincular a {profile.displayName}</Button>
          )}
        </section>
      ) : null}
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/panel/empleados" className="inline-flex min-h-11 items-center gap-2 font-medium hover:underline">
      <ArrowLeft size={18} aria-hidden="true" />
      Empleados
    </Link>
  )
}

function Schedule({ employee: e }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(e.schedule)
  const [error, setError] = useState(null)
  const [failure, setFailure] = useState(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    const problem = scheduleProblem(value)
    if (problem) return setError(problem)
    setBusy(true)
    setFailure(null)
    try {
      await saveSchedule(e.id, value)
      setEditing(false)
      setSaved(true)
    } catch (err) {
      setFailure(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-14" aria-labelledby="horario">
      <h2 id="horario" className="text-xl font-bold">Horario de trabajo</h2>
      {e.bookable ? <p className="mt-1 text-ink-soft">La app solo ofrece citas con este Empleado dentro de este horario.</p> : null}
      {saved && !editing ? <div className="mt-4"><Note tone="done" title="Horario guardado. Ya aplica en la app." /></div> : null}
      {editing ? (
        <div className="mt-4">
          <ScheduleEditor value={value} onChange={(v) => { setValue(v); setError(null) }} error={error} />
          {failure ? <div className="mt-4"><Note title={networkMessage(failure).title}>{networkMessage(failure).body}</Note></div> : null}
          <div className="mt-5 flex gap-3">
            <Button onClick={save} loading={busy}>Guardar horario</Button>
            <Button variant="secondary" onClick={() => { setEditing(false); setValue(e.schedule); setError(null) }}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3 font-medium">{scheduleSummary(e.schedule)}</p>
          <Button variant="secondary" className="mt-4" onClick={() => { setEditing(true); setSaved(false); setValue(e.schedule) }}>Cambiar horario</Button>
        </>
      )}
    </section>
  )
}
