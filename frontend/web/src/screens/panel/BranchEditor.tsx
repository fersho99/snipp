'use client'

import type { Branch, BranchImage, DayHours } from '../../types/domain'
import type { BranchForm } from '../../services/branches'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useQueryState } from '@/lib/navigation'
import { useBusinessPanel } from '@/components/PanelContext'
import { ArrowLeft, ImageSquare, PauseCircle, Star, UploadSimple } from '@phosphor-icons/react'
import { Button, Checkbox, Dialog, Note, TextArea, TextField } from '../../components/ui'
import { networkMessage, type ApiError } from '../../services/auth'
import { createBranch, imageProblem, MAX_IMAGE_MB, saveBranch, setBranchActive } from '../../services/branches'
import BranchServices from './BranchServices'
import { toast } from '@/lib/toast'
import { NOTICE, NOTICE_ICON } from '../../components/status'

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
type BranchDraft = BranchForm
const EMPTY: BranchDraft = { name: '', address: '', phone: '', description: '', hours: [null, null, null, null, null, null, null], images: [], coverId: null }
let uploadId = 1

// New branch (RF-W05) or editing one (RF-W06, RF-W07, RF-W09).
// Editing has two views: the branch data and its services (?vista=servicios).
export default function BranchEditor({ mode }: { mode: string }) {
  const { branchId } = useParams<{ branchId: string }>()
  const [params, setParams] = useQueryState()
  const { business, branches } = useBusinessPanel()
  const branch = mode === 'editar' ? branches.find((b) => b.id === branchId) : null

  if (mode === 'editar' && !branch) {
    // RNF-W04: a branch of another business, or one that does not exist.
    return (
      <div className="max-w-xl">
        <BackLink />
        <h1 className="mt-6 text-[28px] font-bold leading-tight">No encontramos esta sucursal</h1>
        <p className="mt-2">Puede que la dirección esté mal escrita o que la sucursal no sea de {business.name}.</p>
      </div>
    )
  }

  const view = params.get('vista') === 'servicios' ? 'servicios' : 'datos'
  const created = params.get('creada') === '1'

  return (
    <div className="max-w-4xl">
      <BackLink />
      <h1 className="mt-6 text-[28px] font-bold leading-tight">{branch ? branch.name : 'Registrar sucursal'}</h1>
      {branch ? <p className="mt-1 text-ink-soft">{branch.address}</p> : <p className="mt-1 text-ink-soft">Después de guardarla agregas sus servicios.</p>}

      {created ? (
        <div className="mt-6">
          <Note tone="done" title={`Registraste ${branch?.name ?? ''}`}>Agrega sus servicios: sin servicios activos los clientes no pueden reservar en ella.</Note>
        </div>
      ) : null}

      {branch && !branch.active ? <Inactive businessId={business.id} branch={branch} /> : null}

      {branch ? (
        <div role="tablist" aria-label="Partes de la sucursal" className="mt-8 flex gap-6 border-b border-divider">
          {[['datos', 'Datos, horario y fotos'], ['servicios', `Servicios (${branch.services.length})`]].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setParams(id === 'servicios' ? { vista: 'servicios' } : {}, { replace: true })}
              className={`relative -mb-px min-h-11 pb-2 text-[15px] ${view === id ? 'border-b-[3px] border-ink font-semibold' : 'text-ink-soft hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {branch && view === 'servicios' ? (
        <BranchServices key={branch.id} businessId={business.id} branch={branch} />
      ) : (
        <BranchFormView key={branch?.id ?? 'nueva'} businessId={business.id} branch={branch} />
      )}

      {branch && branch.active && view === 'datos' ? <Deactivate businessId={business.id} branch={branch} /> : null}
    </div>
  )
}

function BackLink() {
  return (
    <Link href="/panel/sucursales" className="inline-flex min-h-11 items-center gap-2 font-medium hover:underline">
      <ArrowLeft size={18} aria-hidden="true" />
      Sucursales y servicios
    </Link>
  )
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function BranchFormView({ businessId, branch }: { businessId: string; branch?: Branch | null }) {
  const router = useRouter()
  const [form, setForm] = useState<BranchDraft>(() => (branch ? { ...branch, hours: [...branch.hours], images: [...branch.images] } : { ...EMPTY, hours: [...EMPTY.hours] }))
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({})
  const [imageError, setImageError] = useState<string | null>(null)
  const [failure, setFailure] = useState<ApiError | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const addInput = useRef<HTMLInputElement>(null)

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((x) => ({ ...x, [key]: undefined }))
    setSaved(false)
  }
  const setDay = (day: number, value: DayHours) => {
    setForm((f) => ({ ...f, hours: f.hours.map((h, i) => (i === day ? value : h)) }))
    setErrors((x) => ({ ...x, hours: undefined }))
    setSaved(false)
  }

  // RNF-W05: only JPG or PNG up to 5 MB; the rest is rejected with a message.
  const readFiles = (files: File[]) => {
    const problems: string[] = []
    const ok: BranchImage[] = []
    for (const file of files) {
      const problem = imageProblem(file)
      if (problem) problems.push(problem)
      else ok.push({ id: `nueva-${uploadId++}`, src: URL.createObjectURL(file), name: file.name })
    }
    setImageError(problems.length ? problems.join(' ') : null)
    return ok
  }
  const addImages = (files: File[]) => {
    const ok = readFiles(files)
    if (!ok.length) return
    setForm((f) => ({ ...f, images: [...f.images, ...ok], coverId: f.coverId ?? ok[0].id }))
    setSaved(false)
  }
  const replaceImage = (id: string, files: File[]) => {
    const [ok] = readFiles(files)
    if (!ok) return
    setForm((f) => ({ ...f, images: f.images.map((i) => (i.id === id ? ok : i)), coverId: f.coverId === id ? ok.id : f.coverId }))
    setSaved(false)
  }
  const removeImage = (id: string) => {
    setForm((f) => {
      const images = f.images.filter((i) => i.id !== id)
      return { ...f, images, coverId: f.coverId === id ? images[0]?.id ?? null : f.coverId }
    })
    setSaved(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Escribe el nombre con el que los clientes conocen la sucursal.'
    if (!form.address.trim()) next.address = 'Escribe la calle, el número o el cruce y la colonia.'
    if (form.phone.replace(/\D/g, '').length !== 10) next.phone = 'El teléfono debe tener 10 dígitos, sin el +52.'
    const badDay = form.hours.findIndex((h) => h && (!h[0] || !h[1] || toMinutes(h[1]) <= toMinutes(h[0])))
    if (badDay >= 0) next.hours = `Revisa el ${DAYS[badDay].toLowerCase()}: la hora de cierre debe ser después de la de apertura.`
    else if (form.hours.every((h) => !h)) next.hours = 'Marca al menos un día abierto; sin horario no se pueden reservar citas.'
    setErrors(next)
    setFailure(null)
    if (Object.keys(next).length) return
    setSaving(true)
    const data = { name: form.name.trim(), address: form.address.trim(), phone: form.phone.trim(), description: form.description.trim(), hours: form.hours, images: form.images, coverId: form.coverId }
    try {
      if (branch) {
        await saveBranch(businessId, branch.id, data)
        setSaved(true)
        setImageError(null)
      } else {
        const created = await createBranch(businessId, data)
        router.replace(`/panel/sucursales/${created.id}?vista=servicios&creada=1`)
      }
    } catch (err) {
      setFailure(err as ApiError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 flex flex-col">
      <h2 className="text-lg font-semibold">Datos</h2>
      <div className="mt-4 grid max-w-2xl gap-5">
        <TextField label="Nombre de la sucursal" value={form.name} onChange={set('name')} error={errors.name} hint="Así aparece en la búsqueda de la app." />
        <TextField label="Dirección" value={form.address} onChange={set('address')} error={errors.address} hint="Calle y número o cruce, y colonia." />
        <TextField label="Teléfono" prefix="+52" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
        <TextArea label="Descripción" value={form.description} onChange={set('description')} hint="Qué hace especial a esta sucursal: estacionamiento, especialidades, ambiente." />
      </div>

      <h2 className="mt-12 text-lg font-semibold">Horario</h2>
      <p className="mt-1 text-sm text-ink-soft">La app solo ofrece citas dentro de este horario.</p>
      <div className="mt-4 flex max-w-2xl flex-col">
        {WEEK_ORDER.map((day) => {
          const h = form.hours[day]
          return (
            <div key={day} className="flex min-h-14 flex-wrap items-center gap-x-5 gap-y-2 border-b border-divider py-2 last:border-0">
              <Checkbox
                className="w-36"
                label={DAYS[day]}
                checked={!!h}
                onChange={(e) => setDay(day, e.target.checked ? ['10:00', '20:00'] : null)}
              />
              {h ? (
                <div className="flex items-center gap-2">
                  <TimeInput label={`Abre el ${DAYS[day].toLowerCase()}`} value={h[0]} onChange={(v) => setDay(day, [v, h[1]])} />
                  <span aria-hidden="true">a</span>
                  <TimeInput label={`Cierra el ${DAYS[day].toLowerCase()}`} value={h[1]} onChange={(v) => setDay(day, [h[0], v])} />
                </div>
              ) : (
                <span className="text-ink-soft">Cerrado</span>
              )}
            </div>
          )
        })}
      </div>
      {errors.hours ? <p className="mt-3 text-sm font-medium" role="alert">{errors.hours}</p> : null}

      <h2 className="mt-12 text-lg font-semibold">Fotos</h2>
      <p className="mt-1 text-sm text-ink-soft">JPG o PNG de hasta {MAX_IMAGE_MB} MB. La portada es la primera foto que ven los clientes.</p>
      {form.images.length ? (
        <ul className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {form.images.map((img) => {
            const isCover = img.id === form.coverId
            return (
              <li key={img.id}>
                <div className="relative">
                  <img src={img.src} alt={`Foto ${img.name}`} className="aspect-[4/3] w-full rounded-photo object-cover" />
                  {isCover ? (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">
                      <Star size={12} weight="fill" aria-hidden="true" />
                      Portada
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 truncate text-sm text-ink-soft">{img.name}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {!isCover ? (
                    <button type="button" className="min-h-9 font-medium underline underline-offset-4" onClick={() => { setForm((f) => ({ ...f, coverId: img.id })); setSaved(false) }}>
                      Usar como portada
                    </button>
                  ) : null}
                  <label className="inline-flex min-h-9 cursor-pointer items-center font-medium underline underline-offset-4 focus-within:outline-2">
                    Cambiar
                    <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="sr-only" onChange={(e) => { replaceImage(img.id, [...(e.target.files ?? [])]); e.target.value = '' }} />
                  </label>
                  <button type="button" className="min-h-9 font-medium underline underline-offset-4" onClick={() => removeImage(img.id)}>Quitar</button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-ink-soft">
          <ImageSquare size={22} aria-hidden="true" />
          Sin fotos todavía. La app muestra la sucursal sin imagen hasta que agregues una.
        </p>
      )}
      <div className="mt-5">
        <Button type="button" variant="secondary" onClick={() => addInput.current?.click()}>
          <UploadSimple size={18} aria-hidden="true" />
          Agregar fotos
        </Button>
        <input ref={addInput} type="file" multiple accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { addImages([...(e.target.files ?? [])]); e.target.value = '' }} />
      </div>
      {imageError ? <div className="mt-4"><Note title="Algunas fotos no se agregaron">{imageError}</Note></div> : null}

      <div className="mt-12 flex flex-col gap-4">
        {failure ? <Note title={networkMessage(failure).title}>{networkMessage(failure).body}</Note> : null}
        {saved ? <Note tone="done" title="Cambios guardados. Ya se ven en la app." /> : null}
        <Button type="submit" loading={saving} className="self-start">{branch ? 'Guardar cambios' : 'Registrar sucursal'}</Button>
      </div>
    </form>
  )
}

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      aria-label={label}
      value={value}
      step={900}
      onChange={(e) => onChange(e.target.value)}
      className="tabular min-h-11 rounded-control border-2 border-divider bg-sunken px-3 text-[15px] outline-none focus:border-ink-soft focus:bg-raised"
    />
  )
}

// RF-W09, RN-14: the branch leaves the app and stops receiving bookings;
// nothing is deleted and booked appointments are kept.
function Deactivate({ businessId, branch }: { businessId: string; branch: Branch }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<ApiError | null>(null)
  const confirm = async () => {
    setBusy(true)
    setFailure(null)
    try {
      await setBranchActive(businessId, branch.id, false)
      setOpen(false)
      toast(`Desactivaste ${branch.name}. Ya no aparece en la app; sus datos se conservan.`)
    } catch (err) {
      setFailure(err as ApiError)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="mt-16 border-t border-divider pt-8" aria-labelledby="desactivar">
      <h2 id="desactivar" className="text-lg font-semibold">Desactivar sucursal</h2>
      <p className="mt-1 max-w-prose">Deja de aparecer en la app y no recibe reservas nuevas. Sus datos, fotos y servicios se guardan, y puedes reactivarla cuando quieras.</p>
      <Button variant="secondary" className="mt-4" onClick={() => setOpen(true)}>Desactivar {branch.name}</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`¿Desactivar ${branch.name}?`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>No, dejarla activa</Button>
            <Button onClick={confirm} loading={busy}>Sí, desactivar</Button>
          </>
        }
      >
        <p>Los clientes ya no la verán en la app ni podrán reservar en ella. No se borra nada.</p>
        <p>
          {branch.upcoming
            ? `Tiene ${branch.upcoming === 1 ? '1 cita agendada' : `${branch.upcoming} citas agendadas`} a partir de hoy. Se respetan; si necesitas cancelar alguna, hazlo desde la Agenda y el cliente recibe el aviso.`
            : 'No tiene citas agendadas a partir de hoy.'}
        </p>
        {failure ? <Note title={networkMessage(failure).title}>No se desactivó la sucursal. Intenta de nuevo.</Note> : null}
      </Dialog>
    </section>
  )
}

function Inactive({ businessId, branch }: { businessId: string; branch: Branch }) {
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<ApiError | null>(null)
  const reactivate = async () => {
    setBusy(true)
    setFailure(null)
    try {
      await setBranchActive(businessId, branch.id, true)
      toast(`Reactivaste ${branch.name}. Ya aparece otra vez en la app.`)
    } catch (err) {
      setFailure(err as ApiError)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className={`mt-6 flex flex-col gap-3 rounded-control px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${NOTICE.gris}`} role="status">
      <div className="flex gap-3">
        <PauseCircle size={22} weight="fill" className={`mt-0.5 shrink-0 ${NOTICE_ICON.gris}`} aria-hidden="true" />
        <div>
          <p className="font-semibold">Esta sucursal está desactivada</p>
          <p className="text-sm">No aparece en la app ni recibe reservas nuevas. Al reactivarla vuelve con sus datos, fotos y servicios como estaban.</p>
          {failure ? <p className="mt-1 text-sm font-medium" role="alert">{networkMessage(failure).title}. Intenta de nuevo.</p> : null}
        </div>
      </div>
      <Button onClick={reactivate} loading={busy} className="shrink-0">Reactivar sucursal</Button>
    </div>
  )
}
