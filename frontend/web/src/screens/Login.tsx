'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthLayout from '../components/AuthLayout'
import { Button, Note, TextField, TextLink } from '../components/ui'
import { ApiError, login, networkMessage, type ApiErrorCode } from '../services/auth'
import { isEmail } from '../theme'

// Sign in (RF-W03): Administrador, Jefe and Empleado share this screen; the
// account decides which panel opens (RF-W04).
// States: ?estado=credenciales | cargando | sin-conexion | error-servidor
export default function Login() {
  const params = useSearchParams()
  const estado = params.get('estado')
  const router = useRouter()
  const [email, setEmail] = useState(estado ? 'martin.salazar@loscompas.mx' : '')
  const [password, setPassword] = useState(estado ? 'contraseña' : '')
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({})
  const [loading, setLoading] = useState(estado === 'cargando')
  const forced: Record<string, ApiErrorCode> = { credenciales: 'credentials', 'sin-conexion': 'offline', 'error-servidor': 'server' }
  const [failure, setFailure] = useState<ApiErrorCode | null>(estado ? forced[estado] ?? null : null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!isEmail(email)) next.email = 'Escribe tu correo completo, por ejemplo nombre@gmail.com.'
    if (!password) next.password = 'Escribe tu contraseña.'
    setErrors(next)
    setFailure(null)
    if (Object.keys(next).length) return
    setLoading(true)
    try {
      await login(email, password, estado === 'cargando' ? null : estado)
      router.replace('/panel')
    } catch (err) {
      setFailure(err instanceof ApiError ? err.code : 'server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout photo="interior">
      <h1 className="text-[28px] font-bold leading-tight">Entra a tu panel de SNIPP</h1>
      <p className="mt-2 text-ink-soft">Con la cuenta de tu negocio, de empleado o de administrador.</p>

      <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-6">
        <TextField
          label="Correo"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: undefined })) }}
          error={errors.email}
        />
        <div className="flex flex-col gap-2">
          <TextField
            label="Contraseña"
            secure
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: undefined })) }}
            error={errors.password}
          />
          <TextLink to="/recuperar" className="self-start text-sm">¿Olvidaste tu contraseña?</TextLink>
        </div>

        {failure === 'credentials' ? (
          <Note title="El correo o la contraseña no coinciden">Revisa que estén bien escritos. Si no la recuerdas, puedes cambiarla con un enlace a tu correo.</Note>
        ) : failure ? (
          <Note title={networkMessage({ code: failure }).title}>{networkMessage({ code: failure }).body}</Note>
        ) : null}

        <Button type="submit" loading={loading}>{loading ? 'Entrando' : 'Entrar'}</Button>
      </form>

      <div className="mt-10 flex flex-col gap-3 text-[15px]">
        <p>
          ¿Tienes una barbería, estética o salón? <TextLink to="/registro/negocio">Registra tu negocio</TextLink>
        </p>
        <p>
          ¿Trabajas en uno? <TextLink to="/registro/empleado">Crea tu cuenta de empleado</TextLink>
        </p>
      </div>
    </AuthLayout>
  )
}
