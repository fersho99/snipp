'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { EnvelopeSimple } from '@phosphor-icons/react'
import AuthLayout from '../components/AuthLayout'
import { Button, Note, TextField, TextLink } from '../components/ui'
import { ApiError, networkMessage, requestReset } from '../services/auth'
import { LIMITS } from '@shared/validators'
import { isEmail } from '../theme'

// Recover password (RF-W03): the email gets a link to set a new password.
// States: ?estado=enviado | cargando | sin-conexion | error-servidor
export default function Recover() {
  const params = useSearchParams()
  const estado = params.get('estado')
  const [email, setEmail] = useState(estado ? 'martin.salazar@loscompas.mx' : '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(estado === 'cargando')
  const [failure, setFailure] = useState(estado === 'sin-conexion' ? new ApiError('offline') : estado === 'error-servidor' ? new ApiError('server') : null)
  const [sentTo, setSentTo] = useState(estado === 'enviado' ? 'martin.salazar@loscompas.mx' : null)
  const [resending, setResending] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEmail(email)) {
      setError('Escribe el correo con el que entras a SNIPP.')
      return
    }
    setLoading(true)
    setFailure(null)
    try {
      await requestReset(email, estado === 'cargando' ? null : estado)
      setSentTo(email.trim())
    } catch (err) {
      setFailure(err as ApiError)
    } finally {
      setLoading(false)
    }
  }

  if (sentTo) {
    return (
      <AuthLayout photo="interior">
        <EnvelopeSimple size={28} />
        <h1 className="mt-4 text-[28px] font-bold leading-tight">Revisa tu correo</h1>
        <p className="mt-3">
          Si <span className="font-semibold">{sentTo}</span> tiene una cuenta en SNIPP, te llega un correo con un enlace para crear una contraseña nueva.
        </p>
        <p className="mt-3 text-ink-soft">Si no lo ves en unos minutos, busca en correo no deseado.</p>
        <div className="mt-8 flex flex-col items-start gap-4">
          <Button
            variant="secondary"
            loading={resending}
            onClick={async () => { setResending(true); await requestReset(sentTo); setResending(false) }}
          >
            Mandar el correo otra vez
          </Button>
          <TextLink to="/entrar">Volver a Entrar</TextLink>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout photo="interior">
      <h1 className="text-[28px] font-bold leading-tight">Cambia tu contraseña con un enlace a tu correo</h1>
      <p className="mt-2 text-ink-soft">Escribe el correo con el que entras a SNIPP.</p>
      <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-6">
        <TextField
          label="Correo"
          type="email"
          autoComplete="email"
          maxLength={LIMITS.email}
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null) }}
          error={error}
        />
        {failure ? <Note title={networkMessage(failure).title}>{networkMessage(failure).body}</Note> : null}
        <Button type="submit" loading={loading}>{loading ? 'Enviando' : 'Mandar enlace'}</Button>
      </form>
      <TextLink to="/entrar" className="mt-8 inline-block">Volver a Entrar</TextLink>
    </AuthLayout>
  )
}
