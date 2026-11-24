'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthLayout from '../components/AuthLayout'
import { Button, Note, TextField, TextLink } from '../components/ui'
import { ApiError, networkMessage, registerEmployee } from '../services/auth'
import { LIMITS, checkEmail, checkName, checkPassword, collect } from '@shared/validators'
import { firstName } from '../theme'

// Employee sign-up (RF-W02): an account of their own, not tied to any
// business. They join one later by invitation or by request (RF-W10).
// States: ?estado=correo-registrado | sin-conexion | error-servidor | listo
export default function RegisterEmployee() {
  const params = useSearchParams()
  const estado = params.get('estado')
  const router = useRouter()
  const demo = !!estado
  const [form, setForm] = useState({
    name: demo ? 'Paola Núñez' : '',
    email: demo ? 'paola.nunez@gmail.com' : '',
    password: demo ? 'recepcion26' : '',
  })
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({})
  const [loading, setLoading] = useState(false)
  const [failure, setFailure] = useState((estado === 'sin-conexion' ? new ApiError('offline') : estado === 'error-servidor' ? new ApiError('server') : estado === 'correo-registrado' ? new ApiError('email-taken') : null))
  const [created, setCreated] = useState(estado === 'listo' ? { name: 'Paola Núñez', email: 'paola.nunez@gmail.com' } : null)

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((x) => ({ ...x, [key]: undefined }))
    if (key === 'email') setFailure(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    Object.assign(next, collect({ name: checkName(form.name), email: checkEmail(form.email), password: checkPassword(form.password) }))
    setErrors(next)
    setFailure(null)
    if (Object.keys(next).length) return
    setLoading(true)
    try {
      setCreated(await registerEmployee(form, estado))
    } catch (err) {
      setFailure(err instanceof ApiError ? err : new ApiError('server'))
    } finally {
      setLoading(false)
    }
  }

  if (created) {
    return (
      <AuthLayout photo="fade">
        <Note tone="done" title="Tu cuenta de empleado ya existe" />
        <h1 className="mt-6 text-[28px] font-bold leading-tight">
          Listo, {firstName(created.name)}. Todavía no trabajas en ningún negocio de SNIPP
        </h1>
        <p className="mt-3">
          Para unirte a uno, el Jefe del negocio te invita a {created.email}, o tú le mandas una solicitud desde tu panel. Cuando te acepte, apareces en la agenda de su sucursal.
        </p>
        <p className="mt-3 text-ink-soft">Tu cuenta es tuya: si un día cambias de negocio, conservas tu perfil.</p>
        <Button className="mt-8 w-full" onClick={() => router.replace('/panel')}>Ir a mi panel</Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout photo="fade">
      <h1 className="text-[28px] font-bold leading-tight">Crea tu cuenta de empleado</h1>
      <p className="mt-2 text-ink-soft">Es tuya, no del negocio donde trabajas. Te unes a un negocio después.</p>
      <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-5">
        <TextField label="Nombre completo" autoComplete="name" maxLength={LIMITS.name} value={form.name} onChange={set('name')} error={errors.name} />
        <TextField
          label="Correo"
          type="email"
          autoComplete="email"
          maxLength={LIMITS.email}
          value={form.email}
          onChange={set('email')}
          error={errors.email ?? (failure?.code === 'email-taken' ? 'Ya hay una cuenta con este correo. Entra con ella o usa otro correo.' : undefined)}
          hint="Usa el correo al que el Jefe te va a invitar."
        />
        <TextField label="Contraseña" secure autoComplete="new-password" maxLength={LIMITS.password} value={form.password} onChange={set('password')} error={errors.password} hint="Al menos 8 caracteres, con una letra y un número." />
        {failure && failure.code !== 'email-taken' ? <Note title={networkMessage(failure).title}>{networkMessage(failure).body}</Note> : null}
        <Button type="submit" className="mt-3" loading={loading}>{loading ? 'Creando cuenta' : 'Crear mi cuenta'}</Button>
      </form>
      <p className="mt-6 text-[15px]">
        ¿Ya tienes cuenta? <TextLink to="/entrar">Entra</TextLink>
      </p>
    </AuthLayout>
  )
}
