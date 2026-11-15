import { useEffect, useId, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router'
import { List, SignOut, X } from '@phosphor-icons/react'
import { Button, Logo, Note, Skeleton } from './ui'
import SubscriptionNotice from './SubscriptionNotice'
import { accounts, ROLE_LABEL } from '../data/demo'
import { navFor } from '../data/nav'
import { currentSession, devSignIn, networkMessage } from '../services/auth'
import { useReportsStore } from '../services/reports'
import { resetDemoBranches, useBusinessSetup } from '../services/branches'
import { resetDemoStaff } from '../services/staff'
import { resetDemoReports } from '../services/reports'
import { getPickedBranch, loadPanel, setDemoEstado, setPickedBranch, signOut, subscriptionStatus } from '../services/panel'

// Screen index shortcut (development only): ?como=jefe | empleado | sin-negocio | admin
const DEV_ACCOUNTS = { admin: accounts[0], jefe: accounts[1], empleado: accounts[2], 'sin-negocio': accounts[3] }

// Panel shell for the three roles (RF-W04): side menu with only the role's
// sections, the Jefe's branch selector, and the subscription notices
// (RF-W25, RF-W26, RN-13). Under 1024 px the menu becomes a drawer.
export default function PanelLayout() {
  const [params] = useSearchParams()
  const estado = params.get('estado')
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Runs once when the panel opens from the screen index.
  useState(() => {
    const como = params.get('como')
    if (import.meta.env.DEV && DEV_ACCOUNTS[como]) {
      devSignIn(DEV_ACCOUNTS[como].email)
      setDemoEstado(estado)
      resetDemoBranches(DEV_ACCOUNTS[como].businessId, estado === 'sin-sucursales')
      resetDemoStaff(estado)
      resetDemoReports(estado)
    } else if (estado) setDemoEstado(estado)
  })

  const session = currentSession()
  const setup = useBusinessSetup(session?.businessId ?? null, session?.business)
  const reportStore = useReportsStore()
  const [data, setData] = useState(null)
  const [failure, setFailure] = useState(null)
  const [branchId, setBranchId] = useState(getPickedBranch())
  const [attempt, setAttempt] = useState(0)
  // The drawer belongs to the page where it was opened: moving to another
  // section closes it.
  const [menuAt, setMenuAt] = useState(null)
  const menuOpen = menuAt === pathname
  const setMenuOpen = (open) => setMenuAt(open ? pathname : null)

  useEffect(() => {
    if (!session) return
    loadPanel(session).then(setData).catch(setFailure)
  }, [session, attempt])

  const retry = () => {
    setFailure(null)
    setData(null)
    setAttempt((n) => n + 1)
  }

  if (!session) return <Navigate to="/entrar" replace />

  const business = data?.business ?? null
  const sub = business ? subscriptionStatus(business.subscription) : null

  // RF-W26: at sign-in, the Jefe and every Empleado see the overdue message first.
  if (sub?.status === 'vencida' && !session.overdueSeen) return <Navigate to="/pago-pendiente" replace />

  const branches = business ? setup?.branches ?? [] : []
  const activeBranch = branches.find((b) => b.id === branchId) ?? branches.find((b) => b.active) ?? branches[0] ?? null
  const pickBranch = (id) => {
    setPickedBranch(id)
    setBranchId(id)
  }
  const exit = () => {
    signOut()
    navigate('/entrar', { replace: true })
  }

  const ready = !!data
  const sidebar = (
    <Sidebar
      session={session}
      business={business}
      branches={branches}
      activeBranch={activeBranch}
      onPickBranch={pickBranch}
      ready={ready}
      onExit={exit}
      badges={session.role === 'jefe' && business ? { reportes: reportStore.reports.filter((r) => r.businessId === business.id && r.state === 'enviado').length } : {}}
    />
  )

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      {/* Desktop: fixed column */}
      <aside className="hidden border-r border-divider bg-raised lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-y-auto">
        {sidebar}
      </aside>

      {/* Tablet and phone: top bar plus drawer */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-divider bg-raised px-4 py-3 lg:hidden">
        <Link to="/panel" className="rounded-control" aria-label="SNIPP, ir al inicio del panel">
          <Logo size={30} />
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex min-h-11 items-center gap-2 rounded-control px-3 font-semibold hover:bg-sunken"
          aria-expanded={menuOpen}
          aria-controls="panel-menu"
        >
          <List size={22} />
          Menú
        </button>
      </header>
      {menuOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú del panel" onKeyDown={(e) => e.key === 'Escape' && setMenuOpen(false)}>
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />
          <aside id="panel-menu" className="relative h-full w-[min(320px,88vw)] overflow-y-auto bg-raised">
            <button
              type="button"
              autoFocus
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-4 flex size-11 items-center justify-center rounded-control hover:bg-sunken"
              aria-label="Cerrar menú"
            >
              <X size={22} />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <main className="min-w-0 px-4 py-6 sm:px-8 lg:px-12 lg:py-10">
        {failure ? (
          <div className="max-w-xl">
            <Note title={networkMessage(failure).title} action={<Button variant="secondary" className="mt-3 self-start" onClick={retry}>Reintentar</Button>}>
              {failure.code === 'offline'
                ? 'SNIPP necesita internet para mostrar tu panel. Revisa tu conexión y vuelve a intentar.'
                : 'No pudimos cargar tu panel. Intenta de nuevo en un momento.'}
            </Note>
          </div>
        ) : !ready ? (
          <div className="flex max-w-3xl flex-col gap-4" aria-busy="true" aria-label="Cargando tu panel">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="mt-6 h-40 w-full" />
          </div>
        ) : (
          <>
            {business ? <SubscriptionNotice role={session.role} business={business} status={sub} /> : null}
            <Outlet context={{ session, business, activeBranch, branches, setup }} />
          </>
        )}
      </main>
    </div>
  )
}

function Sidebar({ session, business, branches, activeBranch, onPickBranch, ready, onExit, badges }) {
  const groups = navFor(session.role, !!session.businessId)
  const ownBranch = session.role === 'empleado' ? branches.find((b) => b.id === session.branchId) : null

  return (
    <div className="flex min-h-full flex-col px-5 py-6">
      <Link to="/panel" className="hidden self-start rounded-control lg:block" aria-label="SNIPP, ir al inicio del panel">
        <Logo size={32} />
      </Link>

      {/* Who and where */}
      <div className="mt-12 border-b border-divider pb-6 lg:mt-8">
        {session.role === 'admin' ? (
          <p className="font-title text-[17px] font-bold leading-snug">Plataforma SNIPP</p>
        ) : !session.businessId ? (
          <p className="font-title text-[17px] font-bold leading-snug">Sin negocio todavía</p>
        ) : !ready ? (
          <>
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-3 h-12 w-full" />
          </>
        ) : (
          <>
            <p className="font-title text-[17px] font-bold leading-snug">{business?.name}</p>
            {session.role === 'jefe' ? (
              <BranchPicker branches={branches} active={activeBranch} onPick={onPickBranch} />
            ) : ownBranch ? (
              <p className="mt-1 text-sm text-ink-soft">{ownBranch.name}, {ownBranch.address}</p>
            ) : null}
          </>
        )}
      </div>

      <nav aria-label="Secciones del panel" className="mt-4 flex-1">
        {groups.map((g) => (
          <div key={g.title} className="mt-4">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">{g.title}</p>
            <ul className="mt-1.5 flex flex-col">
              {g.items.map(({ id, label, Icon }) => (
                <li key={id}>
                  <NavLink
                    to={`/panel/${id}`}
                    className={({ isActive }) =>
                      `relative flex min-h-11 items-center gap-3 rounded-control px-3 text-[15px] transition-colors hover:bg-sunken ${
                        isActive ? 'bg-sunken font-semibold text-ink' : 'text-ink'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-ink" aria-hidden="true" /> : null}
                        <Icon size={20} weight={isActive ? 'fill' : 'regular'} aria-hidden="true" />
                        {label}
                        {/* RF-W14: one notice per new client report */}
                        {badges[id] ? (
                          <span className="tabular ml-auto min-w-6 rounded-full bg-ink px-1.5 text-center text-xs font-semibold leading-6 text-white">
                            {badges[id]}
                            <span className="sr-only"> {badges[id] === 1 ? 'nuevo' : 'nuevos'}</span>
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-8 border-t border-divider pt-5">
        <p className="font-semibold leading-snug">{session.name}</p>
        <p className="text-sm text-ink-soft">{ROLE_LABEL[session.role]}</p>
        <button
          type="button"
          onClick={onExit}
          className="-mx-3 mt-3 flex min-h-11 items-center gap-3 rounded-control px-3 text-[15px] font-medium hover:bg-sunken"
        >
          <SignOut size={20} aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

// The Jefe picks which branch the branch-level sections show (agenda,
// orders, products and the dashboard). Deactivated branches stay listed so
// the Jefe can still manage them (RF-W09).
function BranchPicker({ branches, active, onPick }) {
  const id = useId()
  if (!branches.length) {
    return (
      <div className="mt-3">
        <p className="text-sm text-ink-soft">Todavía no registras ninguna sucursal.</p>
        <Link to="/panel/sucursales" className="mt-1 inline-block text-sm font-medium underline underline-offset-4">Registrar mi primera sucursal</Link>
      </div>
    )
  }
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-ink-soft">Sucursal</label>
      <select
        id={id}
        value={active?.id}
        onChange={(e) => onPick(e.target.value)}
        className="min-h-11 w-full rounded-control border-2 border-transparent bg-sunken px-3 text-[15px] font-medium text-ink outline-none focus:border-ink-soft"
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}{b.active ? '' : ' (desactivada)'}
          </option>
        ))}
      </select>
    </div>
  )
}
