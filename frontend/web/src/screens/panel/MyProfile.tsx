'use client'

import type { EditableProfile, MyRequest, StaffMember, StaffState } from '../../services/staff'
import { useRef, useState } from 'react'
import { usePanel } from '@/components/PanelContext'
import { ArrowsLeftRight, EnvelopeSimple, UploadSimple, X } from '@phosphor-icons/react'
import { Button, Note, TextField } from '../../components/ui'
import { Avatar } from '../../components/staff'
import { directory } from '../../data/staff'
import { networkMessage, type ApiError } from '../../services/auth'
import { imageProblem, MAX_IMAGE_MB } from '../../services/branches'
import { acceptInvitation, expiresOn, lastAppointmentOf, saveProfile, sendRequest, useStaffStore } from '../../services/staff'
import { longDate, timeOfDay } from '../../theme'
import { NOTICE, NOTICE_ICON } from '../../components/status'

// Mi perfil, for the Empleado (RF-W11): own photo, visible name and
// specialties, which the app shows when a client picks a professional.
// With a business: request a migration to another one (RF-W12).
// Without one: accept an invitation or ask to join a branch (RF-W10).
export default function MyProfile() {
  const { session } = usePanel()
  const s = useStaffStore()
  const me = Object.values(s.staff).find((e) => e.email === session.email) ?? null
  const profile = s.profiles[session.email] ?? { displayName: session.name, specialties: [], photo: null }

  return (
    <div className="max-w-3xl">
      <h1 className="text-[28px] font-bold leading-tight">Mi perfil</h1>
      <p className="mt-1 text-ink-soft">Tu foto y tu nombre aparecen en la app para que los clientes te reconozcan al reservar.</p>
      <ProfileForm key={session.email} email={session.email} profile={profile} />
      {me ? <Migration me={me} email={session.email} store={s} /> : <Join email={session.email} store={s} />}
    </div>
  )
}

function ProfileForm({ email, profile }: { email: string; profile: EditableProfile }) {
  const [form, setForm] = useState({ ...profile, specialties: [...profile.specialties] })
  const [newSpecialty, setNewSpecialty] = useState('')
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({})
  const [failure, setFailure] = useState<ApiError | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const change = (patch: Partial<EditableProfile>) => {
    setForm((f) => ({ ...f, ...patch }))
    setSaved(false)
  }
  const pickPhoto = (file: File | undefined) => {
    if (!file) return
    const problem = imageProblem(file) // RNF-W05: JPG or PNG up to 5 MB
    setErrors((x) => ({ ...x, photo: problem }))
    if (!problem) change({ photo: URL.createObjectURL(file) })
  }
  const addSpecialty = () => {
    const v = newSpecialty.trim()
    if (!v) return
    if (!form.specialties.some((x) => x.toLowerCase() === v.toLowerCase())) change({ specialties: [...form.specialties, v] })
    setNewSpecialty('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!form.displayName.trim()) next.displayName = 'Escribe el nombre que verán los clientes.'
    setErrors(next)
    setFailure(null)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await saveProfile(email, { ...form, displayName: form.displayName.trim() })
      setSaved(true)
    } catch (err) {
      setFailure(err as ApiError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 flex flex-col">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar name={form.displayName || '?'} photo={form.photo} size={96} />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>
              <UploadSimple size={18} aria-hidden="true" />
              {form.photo ? 'Cambiar foto' : 'Subir foto'}
            </Button>
            {form.photo ? <Button type="button" variant="secondary" onClick={() => change({ photo: null })}>Quitar foto</Button> : null}
          </div>
          <p className="text-sm text-ink-soft">Una foto tuya, de frente. JPG o PNG de hasta {MAX_IMAGE_MB} MB.</p>
          <input ref={fileInput} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = '' }} />
        </div>
      </div>
      {errors.photo ? <p className="mt-3 text-sm font-medium" role="alert">{errors.photo}</p> : null}

      <TextField className="mt-8 max-w-md" label="Nombre visible" value={form.displayName} onChange={(e) => change({ displayName: e.target.value })} error={errors.displayName} hint="Como te conocen los clientes, por ejemplo «Luis Ortega» o «Güero Ortega»." />

      <div className="mt-8">
        <p className="text-[15px] font-medium">Especialidades</p>
        {form.specialties.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {form.specialties.map((sp) => (
              <li key={sp} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-sunken pl-3.5 pr-1 text-[15px]">
                {sp}
                <button type="button" onClick={() => change({ specialties: form.specialties.filter((x) => x !== sp) })} className="flex size-8 items-center justify-center rounded-full hover:bg-sunken-pressed" aria-label={`Quitar ${sp}`}>
                  <X size={14} weight="bold" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">Todavía no agregas especialidades.</p>
        )}
        <div className="mt-3 flex max-w-md items-end gap-3">
          <TextField
            className="flex-1"
            label="Agregar especialidad"
            value={newSpecialty}
            onChange={(e) => setNewSpecialty(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpecialty() } }}
            placeholder="Por ejemplo: Fades"
          />
          <Button type="button" variant="secondary" onClick={addSpecialty}>Agregar</Button>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-4">
        {failure ? <Note title={networkMessage(failure).title}>{networkMessage(failure).body}</Note> : null}
        {saved ? <Note tone="done" title="Perfil guardado. Así te ven los clientes en la app." /> : null}
        <Button type="submit" loading={busy} className="self-start">Guardar perfil</Button>
      </div>
    </form>
  )
}

const where = (req: MyRequest) => (req.branchName === req.businessName ? req.businessName : `${req.businessName}, sucursal ${req.branchName}`)

// Business + branch pickers shared by "join" and "migrate".
function RequestForm({ email, kind, excludeBusinessId, submitLabel }: { email: string; kind: 'ingreso' | 'migracion'; excludeBusinessId?: string | null; submitLabel: string }) {
  const options = directory.filter((b) => b.id !== excludeBusinessId)
  const [businessId, setBusinessId] = useState(options[0].id)
  const business = options.find((b) => b.id === businessId)
  const [branchId, setBranchId] = useState(business?.branches[0]?.id ?? '')
  const [failure, setFailure] = useState<ApiError | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setFailure(null)
    try {
      await sendRequest(email, kind, businessId, branchId)
    } catch (err) {
      setFailure(err as ApiError)
      setBusy(false)
    }
  }
  const selectCls = 'min-h-12 rounded-control border-2 border-divider bg-sunken px-3 text-base outline-none focus:border-ink-soft'
  return (
    <form onSubmit={submit} className="mt-5 flex max-w-xl flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${kind}-negocio`} className="text-[15px] font-medium">Negocio</label>
          <select id={`${kind}-negocio`} value={businessId} onChange={(e) => { const b = options.find((x) => x.id === e.target.value); if (!b) return; setBusinessId(b.id); setBranchId(b.branches[0]?.id ?? '') }} className={selectCls}>
            {options.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${kind}-sucursal`} className="text-[15px] font-medium">Sucursal</label>
          <select id={`${kind}-sucursal`} value={branchId} onChange={(e) => setBranchId(e.target.value)} className={selectCls}>
            {business?.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>
      {failure ? <Note title={networkMessage(failure).title}>{networkMessage(failure).body}</Note> : null}
      <Button type="submit" loading={busy} className="self-start">{submitLabel}</Button>
    </form>
  )
}

// RF-W12 / RN-11, from the Empleado's side.
function Migration({ me, email, store }: { me: StaffMember; email: string; store: StaffState }) {
  const req = store.mine[email]
  const last = lastAppointmentOf(store, me.id)
  const pending = me.status === 'migracion-pendiente'

  return (
    <section className="mt-16 border-t border-divider pt-8" aria-labelledby="migrar">
      <h2 id="migrar" className="text-xl font-bold">Cambiarte a otro negocio</h2>
      {pending ? (
        <div className={`mt-4 flex gap-3 rounded-control px-5 py-4 ${NOTICE.ambar}`}>
          <ArrowsLeftRight size={22} weight="bold" className={`mt-0.5 shrink-0 ${NOTICE_ICON.ambar}`} aria-hidden="true" />
          <div>
            <p className="font-semibold">{me.migration?.to} aceptó tu solicitud: tu migración está pendiente</p>
            <p className="mt-1 text-sm">
              Ya no se pueden reservar nuevas citas contigo aquí. Tu Jefe decide quién toma cada una de tus citas; las que nadie más pueda atender las atiendes tú.
              {last ? ` Tu última cita es el ${longDate(last.start)}, ${timeOfDay(last.start)}; al terminarla quedas en ${me.migration?.to}.` : ` No te quedan citas, así que quedas en ${me.migration?.to}.`}
            </p>
            <p className="mt-1 text-sm">Conservas tu cuenta, tu foto y tu perfil. Tu historial y tus reseñas se quedan en este negocio.</p>
          </div>
        </div>
      ) : req?.kind === 'migracion' && req.status === 'enviada' ? (
        <div className="mt-4">
          <Note tone="done" title={`Solicitud enviada a ${where(req)}`}>
            La enviaste el {longDate(req.sentOn)}. Si su Jefe no responde, caduca el {longDate(expiresOn(req.sentOn))} y puedes volver a enviarla. Mientras tanto sigues trabajando aquí como siempre.
          </Note>
        </div>
      ) : (
        <>
          {req?.kind === 'migracion' && req.status === 'caducada' ? (
            <div className="mt-4">
              <Note title={`Tu solicitud a ${req.businessName} caducó`}>
                Su Jefe no respondió en 7 días (venció el {longDate(expiresOn(req.sentOn))}). Puedes enviarla de nuevo o elegir otro negocio.
              </Note>
            </div>
          ) : null}
          <p className="mt-3 max-w-prose">
            Envía una solicitud al negocio al que te quieres cambiar. Si su Jefe la acepta, ya no se reservan nuevas citas contigo aquí y te cambias cuando termines tus citas. Si no responde en 7 días, la solicitud caduca.
          </p>
          <RequestForm email={email} kind="migracion" excludeBusinessId={me.businessId} submitLabel="Solicitar migración" />
        </>
      )}
    </section>
  )
}

// RF-W10, for an Empleado without a business.
function Join({ email, store }: { email: string; store: StaffState }) {
  const req = store.mine[email]
  const invitations = store.invitations.filter((i) => i.email === email)
  const [busy, setBusy] = useState<string | null>(null)
  const [failure, setFailure] = useState<ApiError | null>(null)

  const accept = async (id: string) => {
    setBusy(id)
    setFailure(null)
    try {
      await acceptInvitation(id)
    } catch (err) {
      setFailure(err as ApiError)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="mt-16 border-t border-divider pt-8" aria-labelledby="unirme">
      <h2 id="unirme" className="text-xl font-bold">Unirte a un negocio</h2>
      {invitations.length ? (
        <ul className="mt-4">
          {invitations.map((i) => (
            <li key={i.id} className="flex flex-col gap-3 border-b border-divider py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <EnvelopeSimple size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">{i.businessName} te invitó a {i.branchName}</p>
                  <p className="text-sm text-ink-soft">Invitación del {longDate(i.sentOn)}</p>
                </div>
              </div>
              <Button onClick={() => accept(i.id)} loading={busy === i.id} className="shrink-0">Aceptar invitación</Button>
            </li>
          ))}
        </ul>
      ) : null}
      {failure ? <div className="mt-4"><Note title={networkMessage(failure).title}>{networkMessage(failure).body}</Note></div> : null}

      {req?.status === 'aceptada' ? (
        <div className="mt-4">
          <Note tone="done" title={`Ya eres parte de ${where(req)}`}>
            Vuelve a entrar a SNIPP para ver tus citas, los pedidos de tu sucursal y tu historial.
          </Note>
        </div>
      ) : req?.status === 'enviada' ? (
        <div className="mt-4">
          <Note tone="done" title={`Solicitud enviada a ${where(req)}`}>
            La enviaste el {longDate(req.sentOn)}. Cuando su Jefe la acepte y te asigne tu horario, aquí verás tus citas.
          </Note>
        </div>
      ) : (
        <>
          <p className="mt-3 max-w-prose">Pide unirte a la sucursal donde trabajas. Su Jefe acepta tu solicitud y te asigna tu horario. También te puede invitar por correo.</p>
          <RequestForm email={email} kind="ingreso" submitLabel="Enviar solicitud" />
        </>
      )}
    </section>
  )
}
