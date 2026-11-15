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
    ],
  },
  {
    group: 'Lote W2: estructura del panel',
    items: [
      { title: 'Panel del Jefe (Martín Salazar), con selector de sucursal', path: '/panel?como=jefe', states: [['Prueba gratuita termina en 7 días', 'aviso-prueba'], ['Suscripción vence en 7 días', 'aviso-suscripcion'], ['Suscripción vencida', 'vencida'], ['Sin sucursales', 'sin-sucursales'], ['Cargando', 'cargando'], ['Sin conexión', 'sin-conexion'], ['Error del servidor', 'error-servidor']] },
      { title: 'Panel del Empleado (Luis Ortega)', path: '/panel?como=empleado', states: [['Suscripción vencida', 'vencida'], ['Prueba por vencer (el Empleado no ve el aviso)', 'aviso-prueba']] },
      { title: 'Empleado entrando a una sección del Jefe (sin acceso)', path: '/panel/reportes?como=empleado', states: [] },
      { title: 'Empleado sin negocio (Sofía Ramos)', path: '/panel?como=sin-negocio', states: [] },
      { title: 'Panel del Administrador (Daniela Ibarra)', path: '/panel?como=admin', states: [] },
      { title: 'Administrador entrando a una sección del Jefe (sin acceso)', path: '/panel/agenda?como=admin', states: [] },
    ],
  },
  {
    group: 'Lote W3: inicio del Jefe',
    items: [
      { title: 'Métricas por sucursal y por empleado, reportes nuevos y solicitudes', path: '/panel/inicio?como=jefe', states: [['Sin pendientes', 'sin-pendientes'], ['Periodo sin registros', 'sin-datos'], ['Calculando métricas', 'cargando-metricas'], ['Error al calcular', 'error-metricas'], ['Sin sucursales', 'sin-sucursales']] },
    ],
  },
  {
    group: 'Lote W4: sucursales y servicios',
    items: [
      { title: 'Lista de sucursales y anticipación para cancelar o reagendar', path: '/panel/sucursales?como=jefe', states: [['Sin sucursales', 'sin-sucursales'], ['Error al guardar', 'error-guardar'], ['Sin conexión al guardar', 'sin-conexion-guardar']] },
      { title: 'Registrar sucursal', path: '/panel/sucursales/nueva?como=jefe', states: [['Error al guardar', 'error-guardar']] },
      { title: 'Editar sucursal: datos, horario, fotos y desactivar', path: '/panel/sucursales/los-compas-norte?como=jefe', states: [['Error al guardar', 'error-guardar']] },
      { title: 'Servicios de una sucursal', path: '/panel/sucursales/los-compas-centro?vista=servicios&como=jefe', states: [['Error al guardar', 'error-guardar']] },
      { title: 'Sucursal que no es del negocio', path: '/panel/sucursales/estudio-marisol-centro?como=jefe', states: [] },
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
