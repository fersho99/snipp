'use client'

import type { Branch, Service } from '../../types/domain'
// A service being created: minutes and price are still text in the form.
type ServiceDraft = Omit<Service, 'id' | 'minutes' | 'price'> & { minutes: string; price: string }
import { useState } from 'react'
import { Plus } from '@phosphor-icons/react'
import { Button, Checkbox, Note, TextArea, TextField } from '../../components/ui'
import { networkMessage, type ApiError } from '../../services/auth'
import { saveService } from '../../services/branches'
import { money } from '../../theme'
import { StatusTag } from '../../components/status'

const NEW: ServiceDraft = { name: '', description: '', minutes: '', price: '', active: true }

// Service catalog of one branch (RF-W07): name, description, duration,
// price and active/inactive. An inactive service is not offered in the app;
// appointments already booked with it are kept (RN-14).
export default function BranchServices({ businessId, branch }: { businessId: string; branch: Branch }) {
  const [editing, setEditing] = useState<string | null>(null) // service id, 'nuevo' or null
  const [notice, setNotice] = useState<string | null>(null)
  const services = branch.services

  const done = (text: string) => {
    setEditing(null)
    setNotice(text)
  }

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-prose text-ink-soft">Los servicios activos son los que el cliente puede elegir al reservar en esta sucursal.</p>
        {editing !== 'nuevo' ? (
          <Button variant="secondary" className="shrink-0" onClick={() => { setEditing('nuevo'); setNotice(null) }}>
            <Plus size={18} weight="bold" aria-hidden="true" />
            Agregar servicio
          </Button>
        ) : null}
      </div>

      {notice ? <div className="mt-5"><Note tone="done" title={notice} /></div> : null}

      {editing === 'nuevo' ? (
        <ServiceForm businessId={businessId} branchId={branch.id} service={NEW} onCancel={() => setEditing(null)} onSaved={(s) => done(s.active ? `${s.name} ya se ofrece en la app.` : `Guardaste ${s.name} como inactivo; no se ofrece en la app.`)} />
      ) : null}

      {services.length ? (
        <ul className="mt-6">
          {services.map((s) =>
            editing === s.id ? (
              <li key={s.id} className="border-b border-divider last:border-0">
                <ServiceForm businessId={businessId} branchId={branch.id} service={s} onCancel={() => setEditing(null)} onSaved={(x) => done(`Guardaste ${x.name}.`)} />
              </li>
            ) : (
              <ServiceRow key={s.id} businessId={businessId} branchId={branch.id} service={s} onEdit={() => { setEditing(s.id); setNotice(null) }} onToggled={done} />
            ),
          )}
        </ul>
      ) : editing !== 'nuevo' ? (
        <div className="mt-8">
          <p className="font-semibold">Esta sucursal todavía no tiene servicios</p>
          <p className="mt-1 max-w-prose">Sin servicios activos los clientes no pueden reservar en ella. Agrega el primero con su duración y su precio.</p>
        </div>
      ) : null}
    </div>
  )
}

function ServiceRow({ businessId, branchId, service: s, onEdit, onToggled }: { businessId: string; branchId: string; service: Service; onEdit: () => void; onToggled: (text: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<ApiError | null>(null)
  const toggle = async () => {
    setBusy(true)
    setFailure(null)
    try {
      await saveService(businessId, branchId, { ...s, active: !s.active })
      onToggled(s.active ? `${s.name} ya no se ofrece en la app. Las citas ya agendadas con este servicio se respetan.` : `${s.name} vuelve a ofrecerse en la app.`)
    } catch (err) {
      setFailure(err as ApiError)
    } finally {
      setBusy(false)
    }
  }
  return (
    <li className="flex flex-col gap-3 border-b border-divider py-5 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="min-w-0">
        <p className="text-[17px] font-semibold">{s.name}</p>
        {!s.active ? (
          <StatusTag status={{ color: 'gris', icon: 'pausa', label: 'Inactivo: no se ofrece en la app' }} className="mt-1" />
        ) : null}
        {s.description ? <p className="mt-1 max-w-prose text-ink-soft">{s.description}</p> : null}
        <p className="tabular mt-1 text-sm">{s.minutes} min · {money(s.price)}</p>
        {failure ? <p className="mt-1 text-sm font-medium" role="alert">{networkMessage(failure).title}. No se guardó el cambio.</p> : null}
      </div>
      <div className="flex shrink-0 gap-5">
        <button type="button" onClick={onEdit} className="min-h-11 font-medium underline underline-offset-4">Editar</button>
        <button type="button" onClick={toggle} disabled={busy} className="min-h-11 font-medium underline underline-offset-4 disabled:text-ink-soft">
          {busy ? 'Guardando…' : s.active ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    </li>
  )
}

function ServiceForm({ businessId, branchId, service, onCancel, onSaved }: { businessId: string; branchId: string; service: Service | ServiceDraft; onCancel: () => void; onSaved: (s: Service) => void }) {
  const [form, setForm] = useState({ name: service.name, description: service.description, active: service.active, minutes: String(service.minutes), price: String(service.price) })
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({})
  const [failure, setFailure] = useState<ApiError | null>(null)
  const [saving, setSaving] = useState(false)
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((x) => ({ ...x, [key]: undefined }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    const minutes = Number(form.minutes)
    const price = Number(form.price.replace(/[$,\s]/g, ''))
    if (!form.name.trim()) next.name = 'Escribe el nombre del servicio, por ejemplo "Fade".'
    if (!Number.isInteger(minutes) || minutes <= 0) next.minutes = 'Escribe cuántos minutos dura, en número entero.'
    if (!Number.isFinite(price) || price <= 0) next.price = 'Escribe el precio en pesos, mayor que cero.'
    setErrors(next)
    setFailure(null)
    if (Object.keys(next).length) return
    setSaving(true)
    try {
      const saved = await saveService(businessId, branchId, { ...('id' in service ? { id: service.id } : {}), name: form.name.trim(), description: form.description.trim(), minutes, price, active: form.active })
      onSaved(saved)
    } catch (err) {
      setFailure(err as ApiError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="my-6 flex max-w-2xl flex-col gap-5 rounded-control bg-raised p-5">
      <p className="font-semibold">{'id' in service ? `Editar ${service.name}` : 'Servicio nuevo'}</p>
      <TextField label="Nombre" value={form.name} onChange={set('name')} error={errors.name} autoFocus />
      <TextArea label="Descripción" rows={3} value={form.description} onChange={set('description')} hint="Qué incluye, para que el cliente sepa qué está reservando." />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Duración" inputMode="numeric" value={form.minutes} onChange={set('minutes')} error={errors.minutes} hint="En minutos. La app aparta este tiempo en la agenda." />
        <TextField label="Precio" prefix="$" inputMode="decimal" value={form.price} onChange={set('price')} error={errors.price} hint="Se paga en la sucursal." />
      </div>
      <Checkbox label="Activo" hint="Si lo desmarcas, deja de ofrecerse en la app; las citas ya agendadas se respetan." checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
      {failure ? <Note title={networkMessage(failure).title}>{networkMessage(failure).body}</Note> : null}
      <div className="flex gap-3">
        <Button type="submit" loading={saving}>{'id' in service ? 'Guardar servicio' : 'Agregar servicio'}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  )
}
