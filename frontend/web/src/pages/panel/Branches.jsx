import { useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { ImageSquare, PauseCircle, Plus } from '@phosphor-icons/react'
import { Button, Note } from '../../components/ui'
import { networkMessage } from '../../services/auth'
import { saveMinNotice } from '../../services/branches'
import { count } from '../../theme'
import BranchEditor from './BranchEditor'

// Sucursales y servicios (RF-W05 to RF-W09). `sub` picks the screen:
// the list, a new branch, or editing one.
export default function Branches({ sub }) {
  if (sub) return <BranchEditor mode={sub} />
  return <BranchList />
}

const coverOf = (b) => b.images.find((i) => i.id === b.coverId) ?? b.images[0] ?? null

function BranchList() {
  const { business, branches, setup } = useOutletContext()
  return (
    <div className="max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight">Sucursales y servicios</h1>
          <p className="mt-1 text-ink-soft">Lo que registres aquí es lo que ven los clientes en la app.</p>
        </div>
        <Link
          to="/panel/sucursales/nueva"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-control bg-ink px-5 font-semibold text-white hover:bg-ink-pressed sm:self-auto"
        >
          <Plus size={18} weight="bold" aria-hidden="true" />
          Registrar sucursal
        </Link>
      </div>

      {branches.length ? (
        <ul className="mt-8">
          {branches.map((b) => {
            const cover = coverOf(b)
            const active = b.services.filter((s) => s.active).length
            return (
              <li key={b.id} className="flex flex-col gap-4 border-b border-divider py-5 last:border-0 sm:flex-row sm:items-center">
                {cover ? (
                  <img src={cover.src} alt="" className={`h-20 w-32 shrink-0 rounded-photo object-cover ${b.active ? '' : 'grayscale'}`} />
                ) : (
                  <span className="flex h-20 w-32 shrink-0 items-center justify-center rounded-photo bg-sunken text-ink-soft">
                    <ImageSquare size={28} aria-label="Sin fotos" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold">{b.name}</p>
                  {!b.active ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
                      <PauseCircle size={18} weight="fill" aria-hidden="true" />
                      Desactivada: no aparece en la app
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-ink-soft">{b.address} · {b.phone}</p>
                  <p className="mt-0.5 text-sm">
                    {b.services.length ? `${active} de ${count(b.services.length, 'servicio activo', 'servicios activos')}` : 'Sin servicios todavía'} · {count(b.images.length, 'foto', 'fotos')}
                  </p>
                </div>
                <div className="flex gap-5">
                  <Link to={`/panel/sucursales/${b.id}`} className="font-medium underline underline-offset-4">Editar datos</Link>
                  <Link to={`/panel/sucursales/${b.id}?vista=servicios`} className="font-medium underline underline-offset-4">Servicios</Link>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-10">
          <p className="font-semibold">Todavía no registras ninguna sucursal</p>
          <p className="mt-1 max-w-prose">
            {business.name} aparece en la app cuando registras su primera sucursal con su dirección, horario, fotos y servicios.
          </p>
        </div>
      )}

      <MinNotice businessId={business.id} hours={setup.minNoticeHours} />
    </div>
  )
}

// RF-W08: one setting for the whole business, 2 hours by default.
function MinNotice({ businessId, hours }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(hours))
  const [error, setError] = useState(null)
  const [failure, setFailure] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const n = Number(value)
    if (!/^\d+$/.test(value.trim()) || n > 168) {
      setError('Escribe un número entero de horas, de 0 a 168 (una semana).')
      return
    }
    setError(null)
    setFailure(null)
    setSaving(true)
    try {
      await saveMinNotice(businessId, n)
      setEditing(false)
      setSaved(true)
    } catch (err) {
      setFailure(err)
    } finally {
      setSaving(false)
    }
  }

  const rule = (h) => (h === 0 ? 'hasta el momento en que empieza su cita' : `hasta ${h === 1 ? '1 hora' : `${h} horas`} antes de su cita`)

  return (
    <section className="mt-14 border-t border-divider pt-8" aria-labelledby="anticipacion">
      <h2 id="anticipacion" className="text-xl font-bold">Anticipación para cancelar o reagendar</h2>
      <p className="mt-2 max-w-prose">
        Los clientes pueden cancelar o reagendar desde la app <strong className="font-semibold">{rule(hours)}</strong>. Aplica a todas las sucursales. Después de ese límite solo el negocio puede cambiar la cita.
      </p>
      {saved && !editing ? <div className="mt-4"><Note tone="done" title="Anticipación guardada. Ya aplica en la app." /></div> : null}
      {editing ? (
        <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="min-notice" className="text-[15px] font-medium">Horas de anticipación</label>
            <div className="flex items-center gap-3">
              <input
                id="min-notice"
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-invalid={!!error || undefined}
                className={`tabular min-h-12 w-28 rounded-control border-2 bg-sunken px-4 text-base outline-none focus:bg-raised ${error ? 'border-ink' : 'border-transparent focus:border-ink-soft'}`}
              />
              <span>horas antes de la cita</span>
            </div>
            {error ? <p className="text-sm font-medium" role="alert">{error}</p> : <p className="text-sm text-ink-soft">Por defecto son 2 horas.</p>}
          </div>
          {failure ? <Note title={networkMessage(failure).title}>{networkMessage(failure).body}</Note> : null}
          <div className="flex gap-3">
            <Button type="submit" loading={saving}>Guardar</Button>
            <Button type="button" variant="secondary" onClick={() => { setEditing(false); setValue(String(hours)); setError(null); setFailure(null) }}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" className="mt-5" onClick={() => { setEditing(true); setSaved(false); setValue(String(hours)) }}>Cambiar anticipación</Button>
      )}
    </section>
  )
}
