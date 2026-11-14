import { Link, Navigate } from 'react-router'
import { Logo } from '../components/ui'

// Development index: every web screen and state, for review against the SRS.
// Not part of the delivered platform: in production "/" opens Entrar.
const SCREENS = [
  {
    group: 'Lote W1: acceso y registro',
    items: [
      { title: 'Entrar (Administrador, Jefe y Empleado)', path: '/entrar', states: [['Credenciales inválidas', 'credenciales'], ['Entrando', 'cargando'], ['Sin conexión', 'sin-conexion'], ['Error del servidor', 'error-servidor']] },
      { title: 'Recuperar contraseña', path: '/recuperar', states: [['Correo enviado', 'enviado'], ['Enviando', 'cargando'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Crear contraseña nueva (desde el enlace)', path: '/restablecer?token=demo', states: [['Enlace vencido', 'enlace-vencido'], ['Contraseña cambiada', 'listo'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Registro de Jefe con negocio y plan', path: '/registro/negocio', states: [['Correo ya registrado', 'correo-registrado'], ['Cargando planes', 'cargando-planes'], ['Sin planes publicados', 'sin-planes'], ['Sin conexión', 'sin-conexion'], ['Negocio registrado', 'listo']] },
      { title: 'Registro de Empleado sin negocio', path: '/registro/empleado', states: [['Correo ya registrado', 'correo-registrado'], ['Sin conexión', 'sin-conexion'], ['Cuenta creada', 'listo']] },
      { title: 'Después de entrar (lo reemplaza el lote W2)', path: '/panel', states: [] },
    ],
  },
]

export default function DevIndex() {
  if (!import.meta.env.DEV) return <Navigate to="/entrar" replace />
  return (
    <div className="min-h-dvh px-4 py-6 sm:px-10">
      <Logo />
      <main className="mt-12 max-w-3xl">
        <h1 className="text-[28px] font-bold leading-tight">Pantallas de la plataforma web</h1>
        <p className="mt-2 text-ink-soft">Cuentas de prueba y contraseña en frontend/README.md.</p>
        {SCREENS.map((g) => (
          <section key={g.group} className="mt-10">
            <h2 className="text-lg font-semibold">{g.group}</h2>
            <ul className="mt-4 flex flex-col gap-4">
              {g.items.map((s) => (
                <li key={s.path}>
                  <Link to={s.path} className="font-medium underline underline-offset-4">{s.title}</Link>
                  {s.states.length ? (
                    <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 pl-4 text-sm">
                      {s.states.map(([label, estado]) => (
                        <Link key={estado} to={`${s.path}${s.path.includes('?') ? '&' : '?'}estado=${estado}`} className="text-ink-soft underline underline-offset-4 hover:text-ink">
                          {label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  )
}
