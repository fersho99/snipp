'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Navigate } from '@/lib/navigation'
import { usePanel } from '@/components/PanelContext'
import { LockSimple } from '@phosphor-icons/react'
import PanelError from '@/components/PanelError'
import { homeFor, navFor, SECTIONS, type SectionId, type SectionInfo } from '../../data/nav'
import type { ComponentType } from 'react'
import type { Role } from '../../types/domain'
import Dashboard from './Dashboard'
import Branches from './Branches'
import Employees from './Employees'
import MyProfile from './MyProfile'
import MyHistory from './MyHistory'
import Agenda from './Agenda'
import Reports from './Reports'
import Reviews from './Reviews'
import Products from './Products'
import Orders from './Orders'
import Loyalty from './Loyalty'
import Subscription from './Subscription'
import { Businesses, Plans, ReportedReviews } from './AdminPages'

// Sections already built. The rest show which batch builds them.
const PAGES: Partial<Record<SectionId, ComponentType<{ sub?: string }>>> = { inicio: Dashboard, sucursales: Branches, empleados: Employees, perfil: MyProfile, historial: MyHistory, agenda: Agenda, citas: Agenda, reportes: Reports, resenas: Reviews, productos: Products, pedidos: Orders, puntos: Loyalty, suscripcion: Subscription, negocios: Businesses, planes: Plans, 'resenas-reportadas': ReportedReviews }

// /panel opens the home section of each role.
export function PanelHome() {
  const { session } = usePanel()
  return <Navigate to={`/panel/${homeFor(session.role, !!session.businessId)}`} replace />
}

// One panel section. RF-W04: a section outside the role's menu is blocked
// even when its address is typed by hand. The content of each section is
// built in its own batch (W3 to W9); until then this page says which one.
export default function Section({ id, sub }: { id?: SectionId; sub?: string }) {
  const params = useParams<{ section?: string }>()
  const section = (id ?? params.section ?? '') as SectionId
  const { session, activeBranch, branches } = usePanel()
  const hasBusiness = !!session.businessId
  const allowed = navFor(session.role, hasBusiness).flatMap((g) => g.items).map((i) => i.id)
  const home = `/panel/${homeFor(session.role, hasBusiness)}`

  // RF-W29: an address that does not exist shows "Esta página no existe".
  if (!SECTIONS[section]) return <PanelError kind="no-existe" />
  if (!allowed.includes(section)) return <NoAccess id={section} section={SECTIONS[section]} home={home} />

  const s = SECTIONS[section]
  const needsBranch = s.branch && session.role === 'jefe'
  const Page = PAGES[section]
  if (Page && !(needsBranch && !branches.length)) return <Page sub={sub} />

  return (
    <div className="max-w-3xl">
      <h1 className="text-[28px] font-bold leading-tight">{s.label}</h1>
      {needsBranch && activeBranch ? <p className="mt-1 text-ink-soft">{activeBranch.name}, {activeBranch.address}</p> : null}

      {needsBranch && !branches.length ? (
        <div className="mt-8">
          <p className="font-semibold">Todavía no hay nada que mostrar aquí</p>
          <p className="mt-1 max-w-prose">Esta sección muestra los datos de una sucursal. Registra tu primera sucursal y aparecerá en el selector del menú.</p>
          <Link href="/panel/sucursales" className="mt-3 inline-block font-medium underline underline-offset-4">Registrar mi primera sucursal</Link>
        </div>
      ) : session.role === 'empleado' && !hasBusiness ? (
        <div className="mt-8">
          <p className="font-semibold">Todavía no trabajas en ningún negocio</p>
          <p className="mt-1 max-w-prose">
            Cuando un Jefe te invite por correo o acepte tu solicitud, aquí verás tus citas, los pedidos de tu sucursal y tu historial.
          </p>
        </div>
      ) : null}

      {Page ? null : (
        <p className="mt-10 border-l-[3px] border-gray-light pl-4 text-sm text-ink-soft">
          Plantilla pendiente: esta sección se construye en el lote {s.batch} ({s.rf}).
        </p>
      )}
    </div>
  )
}

const WHO: Record<Role, string> = { jefe: 'el Jefe del negocio', empleado: 'los Empleados', admin: 'el Administrador de SNIPP' }

function NoAccess({ id, section, home }: { id: SectionId; section: SectionInfo; home: string }) {
  const owners = (Object.keys(WHO) as Role[]).filter((r) => navFor(r, true).some((g) => g.items.some((i) => i.id === id)))
  return (
    <div className="max-w-xl">
      <LockSimple size={32} aria-hidden="true" />
      <h1 className="mt-4 text-[28px] font-bold leading-tight">No tienes acceso a esta sección</h1>
      <p className="mt-2">«{section.label}» solo la {owners.length > 1 ? 'pueden' : 'puede'} ver {owners.map((r) => WHO[r]).join(' y ')}.</p>
      <Link href={home} className="mt-6 inline-flex min-h-12 items-center rounded-control bg-ink px-5 font-semibold text-white hover:bg-ink-pressed">
        Ir a mi panel
      </Link>
    </div>
  )
}
