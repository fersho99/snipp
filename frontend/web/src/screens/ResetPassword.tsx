'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthLayout from '../components/AuthLayout'
import { LIMITS, checkPassword } from '@shared/validators'
import { Button, Note, TextField, TextLink } from '../components/ui'
import { ApiError, networkMessage, resetPassword } from '../services/auth'

// New password from the email link (RF-W03). The same page serves the app's
// clients and the panel's users. An expired or invalid link is rejected (RNF-G03).
// States: ?estado=enlace-vencido | listo | sin-conexion | error-servidor
export default function ResetPassword() {
  const params = useSearchParams()
  const estado = params.get('estado')
  const router = useRouter()
  const token = params.get('token') ?? (estado ? 'demo' : null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [failure, setFailure] = useState(estado === 'sin-conexion' ? new ApiError('offline') : estado === 'error-servidor' ? new ApiError('server') : null)
  const [done, setDone] = useState(estado === 'listo')
  const [expired, setExpired] = useState(estado === 'enlace-vencido' || !token)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const invalid = checkPassword(password)
    if (invalid) {
      setError(invalid)
      return
    }
    setLoading(true)
    setFailure(null)
    try {
      await resetPassword(token, password, estado)
      setDone(true)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'token') setExpired(true)
      else setFailure(err as ApiError)
    } finally {
      setLoading(false)
    }
  }

  if (expired) {
    return (
      <AuthLayout photo="interior">
        <h1 className="text-[28px] font-bold leading-tight">Este enlace ya no sirve</h1>
        <p className="mt-3">Venció o ya se usó para cambiar la contraseña. Pide uno nuevo y usa el último correo que te llegue.</p>
        <div className="mt-8 flex flex-col items-start gap-4">
          <Button onClick={() => router.push('/recuperar')}>Pedir otro enlace</Button>
          <TextLink to="/entrar">Volver a Entrar</TextLink>
        </div>
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <AuthLayout photo="interior">
        <Note tone="done" title="Ya cambiaste tu contraseña" />
        <h1 className="mt-6 text-[28px] font-bold leading-tight">Entra con tu contraseña nueva</h1>
        <p className="mt-3 text-ink-soft">Si eres cliente, entra desde la app de SNIPP en tu teléfono.</p>
        <Button className="mt-8" onClick={() => router.replace('/entrar')}>Ir a Entrar</Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout photo="interior">
      <h1 className="text-[28px] font-bold leading-tight">Crea tu contraseña nueva</h1>
      <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-6">
        <TextField
          label="Contraseña nueva"
          secure
          autoComplete="new-password"
          maxLength={LIMITS.password}
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null) }}
          error={error}
          hint="Al menos 8 caracteres, con una letra y un número."
        />
        {failure ? <Note title={networkMessage(failure).title}>{networkMessage(failure).body}</Note> : null}
        <Button type="submit" loading={loading}>{loading ? 'Guardando' : 'Guardar contraseña'}</Button>
      </form>
    </AuthLayout>
  )
}
