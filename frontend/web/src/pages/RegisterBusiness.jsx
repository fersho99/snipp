import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Circle, RadioButton } from '@phosphor-icons/react'
import AuthLayout from '../components/AuthLayout'
import { Button, Note, Skeleton, TextField, TextLink } from '../components/ui'
import { ApiError, networkMessage, registerBoss } from '../services/auth'
import { DEMO_TODAY } from '../data/demo'
import { getPlans } from '../services/subscriptions'
import { addMonths, firstName, isEmail, longDate, money } from '../theme'

const duration = (m) => (m === 1 ? 'cada mes' : m === 12 ? 'cada año' : `cada ${m} meses`)

// Jefe sign-up (RF-W01): name, email, phone and password; the business is
// created at the same time with its plan (plans come from the Administrator,
// RF-W27) and starts with one free month (RN-13).
// States: ?estado=correo-registrado | cargando-planes | sin-planes | sin-conexion | error-servidor | listo
export default function RegisterBusiness() {
  const [params] = useSearchParams()
  const estado = params.get('estado')
  const navigate = useNavigate()
  // Plans offered by the Administrator (RF-W27).
  const allPlans = getPlans()
  const plans = estado === 'sin-planes' ? [] : allPlans.filter((p) => p.offered)
  const trialEnds = addMonths(DEMO_TODAY, 1)
  const demo = estado && estado !== 'cargando-planes' && estado !== 'sin-planes'

  const [form, setForm] = useState({
    name: demo ? 'Martín Salazar' : '',
    email: demo ? 'martin.salazar@gmail.com' : '',
    phone: demo ? '653 534 2210' : '',
    password: demo ? 'compas2026' : '',
    businessName: demo ? 'Barbería Los Compas' : '',
    planId: 'mensual',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [failure, setFailure] = useState((estado === 'sin-conexion' ? new ApiError('offline') : estado === 'error-servidor' ? new ApiError('server') : estado === 'correo-registrado' ? new ApiError('email-taken') : null))
  const [created, setCreated] = useState(estado === 'listo' ? { name: 'Martín Salazar', business: { name: 'Barbería Los Compas' }, planId: 'mensual' } : null)

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((x) => ({ ...x, [key]: undefined }))
    if (key === 'email') setFailure(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!form.name.trim()) next.name = 'Escribe tu nombre.'
    if (!isEmail(form.email)) next.email = 'Escribe tu correo completo, por ejemplo nombre@gmail.com.'
    if (form.phone.replace(/\D/g, '').length !== 10) next.phone = 'El teléfono debe tener 10 dígitos, sin el +52.'
    if (form.password.length < 8) next.password = 'Usa al menos 8 caracteres.'
    if (!form.businessName.trim()) next.businessName = 'Escribe el nombre de tu negocio como lo conocen tus clientes.'
    setErrors(next)
    setFailure(null)
    if (Object.keys(next).length) return
    setLoading(true)
    try {
      setCreated(await registerBoss(form, estado))
    } catch (err) {
      setFailure(err instanceof ApiError ? err : new ApiError('server'))
    } finally {
      setLoading(false)
    }
  }

  if (created) {
    const plan = allPlans.find((p) => p.id === created.planId)
    return (
      <AuthLayout photo="fade">
        <Note tone="done" title={`${created.business.name} ya está registrado`} />
        <h1 className="mt-6 text-[28px] font-bold leading-tight">
          Listo, {firstName(created.name)}. Tu prueba gratis dura hasta el {longDate(trialEnds)}
        </h1>
        <p className="mt-3">
          Elegiste el plan {plan.name}: {money(plan.price)} {duration(plan.months)}. El primer cobro es el {longDate(trialEnds)} y lo pagas con tarjeta desde tu panel.
        </p>
        <p className="mt-3 text-ink-soft">Tu negocio aparece en la app de SNIPP en cuanto registres su primera sucursal.</p>
        <Button className="mt-8 w-full" onClick={() => navigate('/panel', { replace: true })}>Ir a mi panel</Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout photo="fade">
      <h1 className="text-[28px] font-bold leading-tight">Registra tu negocio en SNIPP</h1>
      <p className="mt-2">
        Tu primer mes es gratis: el cobro empieza el {longDate(trialEnds)}.
      </p>

      {estado === 'sin-planes' ? (
        <div className="mt-8 flex flex-col gap-6">
          <Note title="Por ahora no hay planes disponibles">
            El registro de negocios se abre en cuanto el Administrador de SNIPP publique los planes. Intenta de nuevo más tarde.
          </Note>
          <TextLink to="/entrar">Volver a Entrar</TextLink>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-8 flex flex-col">
          <h2 className="text-lg font-semibold">Tus datos</h2>
          <div className="mt-4 flex flex-col gap-5">
            <TextField label="Nombre completo" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
            <TextField
              label="Correo"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={set('email')}
              error={errors.email ?? (failure?.code === 'email-taken' ? 'Ya hay una cuenta con este correo. Entra con ella o usa otro correo.' : undefined)}
              hint="Es tu usuario para entrar al panel."
            />
            <TextField label="Teléfono celular" prefix="+52" type="tel" autoComplete="tel-national" value={form.phone} onChange={set('phone')} error={errors.phone} />
            <TextField label="Contraseña" secure autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="Al menos 8 caracteres." />
          </div>

          <h2 className="mt-10 text-lg font-semibold">Tu negocio</h2>
          <TextField
            className="mt-4"
            label="Nombre del negocio"
            value={form.businessName}
            onChange={set('businessName')}
            error={errors.businessName}
            hint="Las sucursales, servicios y horarios los agregas después desde tu panel."
          />

          <h2 className="mt-10 text-lg font-semibold">Plan</h2>
          <p className="mt-1 text-sm text-ink-soft">Hasta el {longDate(trialEnds)} no se cobra nada.</p>
          {estado === 'cargando-planes' ? (
            <div className="mt-4 flex flex-col gap-2" aria-label="Cargando planes">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-control" />)}
            </div>
          ) : (
            <fieldset className="mt-4 flex flex-col gap-1">
              <legend className="sr-only">Plan de suscripción</legend>
              {plans.map((p) => {
                const selected = form.planId === p.id
                const monthly = Math.round(p.price / p.months)
                return (
                  <label
                    key={p.id}
                    className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-control px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${selected ? 'bg-sunken' : 'hover:bg-sunken/60'}`}
                  >
                    <input type="radio" name="plan" value={p.id} checked={selected} onChange={set('planId')} className="sr-only" />
                    {selected ? <RadioButton size={22} weight="fill" /> : <Circle size={22} className="text-ink-soft" />}
                    <span className={`flex-1 ${selected ? 'font-semibold' : ''}`}>{p.name}</span>
                    <span className="tabular text-right">
                      {money(p.price)} {duration(p.months)}
                      {p.months > 1 ? <span className="block text-sm text-ink-soft">{money(monthly)} al mes</span> : null}
                    </span>
                  </label>
                )
              })}
            </fieldset>
          )}

          {failure && failure.code !== 'email-taken' ? (
            <div className="mt-6"><Note title={networkMessage(failure).title}>{networkMessage(failure).body}</Note></div>
          ) : null}

          <Button type="submit" className="mt-8" loading={loading} disabled={estado === 'cargando-planes'}>
            {loading ? 'Registrando' : 'Registrar mi negocio'}
          </Button>
          <p className="mt-6 text-[15px]">
            ¿Ya tienes cuenta? <TextLink to="/entrar">Entra</TextLink>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
