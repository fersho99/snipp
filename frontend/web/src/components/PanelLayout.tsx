'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Navigate } from '@/lib/navigation'
import { PanelContext } from './PanelContext'
import { List, SignOut, X, type Icon } from '@phosphor-icons/react'
import { Logo, Skeleton } from './ui'
import SubscriptionNotice from './SubscriptionNotice'
import PanelError from './PanelError'
import ResetDemo from './ResetDemo'
import { accounts, ROLE_LABEL } from '../data/demo'
import { navFor } from '../data/nav'
import { currentSession, devSignIn, type ApiError } from '../services/auth'
import { useReportsStore } from '../services/reports'
import { useShopStore } from '../services/shop'
import { useStaffStore } from '../services/staff'
import { COUNTER } from './status'
import { resetDemoBranches, useBusinessSetup } from '../services/branches'
import { resetDemoStaff } from '../services/staff'
import { resetDemoReports } from '../services/reports'
import { resetDemoShop } from '../services/shop'
import { applyLoadedSubscription, resetDemoSubscriptions, useSubscriptionsStore } from '../services/subscriptions'
import { getPickedBranch, loadPanel, setDemoEstado, setPickedBranch, signOut, subscriptionStatus } from '../services/panel'
import type { Branch, Business, Session } from '../types/domain'

// Screen index shortcut (development only): ?como=jefe | empleado | sin-negocio | admin
const byEmail = (email: string) => accounts.find((a) => a.email === email) as Session
const DEV_ACCOUNTS: Record<string, Session> = {
  admin: byEmail('admin@snipp.mx'),
  jefe: byEmail('martin.salazar@loscompas.mx'),
  empleado: byEmail('luis.ortega@gmail.com'),
  'sin-negocio': byEmail('sofia.ramos@gmail.com'),
}

// Panel shell for the three roles (RF-W04): side menu with only the role's
// sections, the Jefe's branch selector, and the subscription notices
// (RF-W25, RF-W26, RN-13). Under 1024 px the menu becomes a drawer.
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const params = useSearchParams()
  const estado = params.get('estado')
  const router = useRouter()
  const pathname = usePathname()

  // Runs once when the panel opens from the screen index.
  useState(() => {
    const como = params.get('como') ?? ''
    if (process.env.NODE_ENV === 'development' && DEV_ACCOUNTS[como]) {
      devSignIn(DEV_ACCOUNTS[como].email)
      setDemoEstado(estado)
      resetDemoBranches(DEV_ACCOUNTS[como].businessId, estado === 'sin-sucursales')
      resetDemoStaff(estado)
      resetDemoReports(estado)
      resetDemoShop(estado)
      resetDemoSubscriptions(estado)
    } else if (estado) setDemoEstado(estado)
  })

  const session = currentSession()
  const setup = useBusinessSetup(session?.businessId ?? null)
  const reportStore = useReportsStore()
  const shopStore = useShopStore()
  const staffStore = useStaffStore()
  const subs = useSubscriptionsStore()
  const [data, setData] = useState<{ business: Business | null } | null>(null)
  const [failure, setFailure] = useState<ApiError | null>(null)
  const [branchId, setBranchId] = useState(getPickedBranch())
  const [attempt, setAttempt] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  // The drawer belongs to the page where it was opened: moving to another
  // section closes it.
  const [menuAt, setMenuAt] = useState<string | null>(null)
  const menuOpen = menuAt === pathname
  const setMenuOpen = (open: boolean) => setMenuAt(open ? pathname : null)

  useEffect(() => {
    if (!session) return
    loadPanel(session)
      .then((loaded) => {
        if (loaded.business) {
          applyLoadedSubscription(loaded.business.id, loaded.business.subscription)
        }
        setData(loaded)
      })
      .catch(setFailure)
  }, [session, attempt])

  // RF-W29: "Esto tardó demasiado" after 15 seconds without an answer.
  useEffect(() => {
    if (!session || data || failure || timedOut) return
    const t = setTimeout(() => setTimedOut(true), 15000)
    return () => clearTimeout(t)
  }, [session, data, failure, timedOut, attempt])

  const retry = () => {
    setFailure(null)
    setTimedOut(false)
    setData(null)
    setAttempt((n) => n + 1)
  }

  if (!session) return <Navigate to="/entrar" replace />

  // The subscription lives in its own store so paying it (RF-W25) updates
  // the notices at once.
  const loadedBusiness = data?.business ?? null
  const liveBusiness = loadedBusiness ? subs.businesses.find((b) => b.id === loadedBusiness.id) : null
  const liveSub = liveBusiness?.subscription
  const business = loadedBusiness ? { ...loadedBusiness, subscription: liveSub ?? loadedBusiness.subscription } : null
  const sub = business ? subscriptionStatus(business.subscription) : null

  // RF-W26: at sign-in, the Jefe and every Empleado see the overdue message first.
  if (sub?.status === 'vencida' && !session.overdueSeen) return <Navigate to="/pago-pendiente" replace />

  const branches = business ? setup?.branches ?? [] : []
  const activeBranch = branches.find((b) => b.id === branchId) ?? branches.find((b) => b.active) ?? branches[0] ?? null
  const pickBranch = (id: string) => {
    setPickedBranch(id)
    setBranchId(id)
  }
  const exit = () => {
    signOut()
    router.replace('/entrar')
  }

  const ready = !!data
  // SRS v1.2, 4.2.2 "Menú lateral": orders to prepare in gray, new reports in
  // red (Jefe only). An Empleado counts the orders of their own branch.
  const ordersBranchId = session.role === 'jefe' ? activeBranch?.id : Object.values(staffStore.staff).find((e) => e.email === session.email)?.branchId
  const toPrepare = shopStore.orders.filter((o) => o.branchId === ordersBranchId && o.status === 'pagado').length
  const badges: Badges = {}
  if (session.role !== 'admin' && ordersBranchId) badges.pedidos = { count: toPrepare, tone: 'gris', noun: ['por preparar', 'por preparar'] }
  if (session.role === 'jefe' && business) {
    badges.reportes = { count: reportStore.reports.filter((r) => r.businessId === business.id && r.state === 'enviado').length, tone: 'rojo', noun: ['nuevo', 'nuevos'] }
  }
  const sidebar = (
    <Sidebar
      session={session}
      business={business}
      branches={branches}
      activeBranch={activeBranch}
      onPickBranch={pickBranch}
      ready={ready}
      onExit={exit}
      pathname={pathname}
      badges={badges}
    />
  )

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      {/* Desktop: fixed column */}
      <aside className="hidden border-r border-divider bg-sunken lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-y-auto">
        {sidebar}
      </aside>

      {/* Tablet and phone: top bar plus drawer */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-divider bg-raised px-4 py-3 lg:hidden">
        <Link href="/panel" className="rounded-control" aria-label="SNIPP, ir al inicio del panel">
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
          <aside id="panel-menu" className="relative h-full w-[min(320px,88vw)] overflow-y-auto bg-sunken">
            <button
              type="button"
              autoFocus
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-4 flex size-11 items-center justify-center rounded-control hover:bg-sunken-pressed"
              aria-label="Cerrar menú"
            >
              <X size={22} />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <main className="min-w-0 px-4 py-6 sm:px-8 lg:px-12 lg:py-10">
        {failure || timedOut ? (
          <PanelError kind={timedOut ? 'tiempo' : failure?.code === 'offline' ? 'sin-conexion' : 'servidor'} onRetry={retry} />
        ) : !ready ? (
          <div className="flex max-w-3xl flex-col gap-4" aria-busy="true" aria-label="Cargando tu panel">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="mt-6 h-40 w-full" />
          </div>
        ) : (
          <>
            {business ? <SubscriptionNotice role={session.role} business={business} status={sub} suspended={liveBusiness?.suspended} /> : null}
            <PanelContext.Provider value={{ session, business, activeBranch, branches, setup }}>{children}</PanelContext.Provider>
          </>
        )}
      </main>
    </div>
  )
}

type SidebarProps = {
  session: Session
  business: Business | null
  branches: Branch[]
  activeBranch: Branch | null
  onPickBranch: (id: string) => void
  ready: boolean
  onExit: () => void
  badges: Badges
  pathname: string
}
function Sidebar({ session, business, branches, activeBranch, onPickBranch, ready, onExit, badges, pathname }: SidebarProps) {
  const groups = navFor(session.role, !!session.businessId)
  const ownBranch = session.role === 'empleado' ? branches.find((b) => b.id === session.branchId) : null

  return (
    <div className="flex min-h-full flex-col px-5 py-6">
      <Link href="/panel" className="hidden self-start rounded-control lg:block" aria-label="SNIPP, ir al inicio del panel">
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
                  <NavItem
                    href={`/panel/${id}`}
                    active={pathname === `/panel/${id}` || pathname.startsWith(`/panel/${id}/`)}
                    label={label}
                    Icon={Icon}
                    badge={badges[id]}
                  />
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
          className="-mx-3 mt-3 flex min-h-11 items-center gap-3 rounded-control px-3 text-[15px] font-medium hover:bg-sunken-pressed"
        >
          <SignOut size={20} aria-hidden="true" />
          Cerrar sesión
        </button>
        <ResetDemo className="-mx-3 px-3" />
      </div>
    </div>
  )
}

// The Jefe picks which branch the branch-level sections show (agenda,
// orders, products and the dashboard). Deactivated branches stay listed so
// the Jefe can still manage them (RF-W09).
function BranchPicker({ branches, active, onPick }: { branches: Branch[]; active: Branch | null; onPick: (id: string) => void }) {
  const id = useId()
  if (!branches.length) {
    return (
      <div className="mt-3">
        <p className="text-sm text-ink-soft">Todavía no registras ninguna sucursal.</p>
        <Link href="/panel/sucursales" className="mt-1 inline-block text-sm font-medium underline underline-offset-4">Registrar mi primera sucursal</Link>
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
        className="min-h-11 w-full rounded-control border border-divider bg-raised px-3 text-[15px] font-medium text-ink outline-none focus:border-ink-soft"
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

type Badge = { count: number; tone: 'rojo' | 'gris'; noun: [string, string] }
type Badges = Partial<Record<string, Badge>>

// SRS v1.2, 4.2.2: on the light gray menu, the active section goes in black
// with white text.
function NavItem({ href, active, label, Icon, badge }: { href: string; active: boolean; label: string; Icon: Icon; badge?: Badge }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative flex min-h-11 items-center gap-3 rounded-control px-3 text-[15px] transition-colors ${active ? 'bg-ink font-semibold text-white' : 'text-ink hover:bg-sunken-pressed'}`}
    >
      <Icon size={20} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
      {label}
      {/* RF-W14 and RF-W21: new reports (red) and orders to prepare (gray) */}
      {badge?.count ? (
        <span className={`tabular ml-auto min-w-6 rounded-full px-1.5 text-center text-xs font-semibold leading-6 ${COUNTER[badge.tone]}`}>
          {badge.count}
          <span className="sr-only"> {badge.noun[badge.count === 1 ? 0 : 1]}</span>
        </span>
      ) : null}
    </Link>
  )
}
