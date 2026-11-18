// Panel menu per role (RF-W04, RN-10). Each role only sees, and can only
// open, its own sections; the API enforces the same rule (RNF-W04).
// `branch: true` marks the sections that follow the Jefe's branch selector.
// `batch` and `rf` say where each section is specified and built.
import {
  CalendarBlank,
  ChartBar,
  ClockCounterClockwise,
  CreditCard,
  Flag,
  Package,
  Receipt,
  Star,
  Storefront,
  Tag,
  UserCircle,
  Users,
  Gift,
  Buildings,
  type Icon,
} from '@phosphor-icons/react'
import type { Role } from '../types/domain'

export type SectionId =
  | 'inicio' | 'agenda' | 'pedidos' | 'sucursales' | 'empleados' | 'productos' | 'puntos' | 'reportes'
  | 'resenas' | 'suscripcion' | 'citas' | 'historial' | 'perfil' | 'negocios' | 'planes' | 'resenas-reportadas'
export interface SectionInfo { label: string; Icon: Icon; branch?: boolean; batch: string; rf: string }
export interface NavGroup { title: string; items: (SectionInfo & { id: SectionId })[] }

const S: Record<SectionId, SectionInfo> = {
  inicio: { label: 'Inicio', Icon: ChartBar, branch: true, batch: 'W3', rf: 'RF-W22, RF-W14, RF-W10, RF-W12' },
  agenda: { label: 'Agenda', Icon: CalendarBlank, branch: true, batch: 'W6', rf: 'RF-W15, RF-W16, RF-W18' },
  pedidos: { label: 'Pedidos', Icon: Receipt, branch: true, batch: 'W8', rf: 'RF-W21' },
  sucursales: { label: 'Sucursales y servicios', Icon: Storefront, batch: 'W4', rf: 'RF-W05 a RF-W09' },
  empleados: { label: 'Empleados', Icon: Users, batch: 'W5', rf: 'RF-W10 a RF-W13, RF-W17' },
  productos: { label: 'Productos e inventario', Icon: Package, branch: true, batch: 'W8', rf: 'RF-W19, RF-W20' },
  puntos: { label: 'Puntos de lealtad', Icon: Gift, batch: 'W8', rf: 'RF-W24' },
  reportes: { label: 'Reportes', Icon: Flag, batch: 'W7', rf: 'RF-W14' },
  resenas: { label: 'Reseñas', Icon: Star, batch: 'W7', rf: 'RF-W23' },
  suscripcion: { label: 'Suscripción', Icon: CreditCard, batch: 'W9', rf: 'RF-W25' },
  citas: { label: 'Agenda', Icon: CalendarBlank, batch: 'W6', rf: 'RF-W15, RF-W18' },
  historial: { label: 'Mi historial de citas', Icon: ClockCounterClockwise, batch: 'W5', rf: 'RF-W17' },
  perfil: { label: 'Mi perfil', Icon: UserCircle, batch: 'W5', rf: 'RF-W11, RF-W12' },
  negocios: { label: 'Negocios', Icon: Buildings, batch: 'W9', rf: 'RF-W27, RF-W28' },
  planes: { label: 'Planes', Icon: Tag, batch: 'W9', rf: 'RF-W27' },
  'resenas-reportadas': { label: 'Reseñas reportadas', Icon: Flag, batch: 'W9', rf: 'RF-W28' },
}

const group = (title: string, ids: SectionId[]): NavGroup => ({ title, items: ids.map((id) => ({ id, ...S[id] })) })

// An Empleado without a business only has their profile until a Jefe links
// them to a branch (RF-W02, RF-W10).
export function navFor(role: Role, hasBusiness: boolean): NavGroup[] {
  if (role === 'admin') return [group('Plataforma', ['negocios', 'planes', 'resenas-reportadas'])]
  if (role === 'empleado') {
    return hasBusiness
      ? [group('Mi trabajo', ['citas', 'pedidos', 'historial']), group('Cuenta', ['perfil'])]
      : [group('Cuenta', ['perfil'])]
  }
  return [
    group('Día a día', ['inicio', 'agenda', 'pedidos']),
    group('Negocio', ['sucursales', 'empleados', 'productos', 'puntos']),
    group('Clientes', ['reportes', 'resenas']),
    group('Cuenta', ['suscripcion']),
  ]
}

export const homeFor = (role: Role, hasBusiness: boolean): SectionId =>
  role === 'admin' ? 'negocios' : role === 'empleado' ? (hasBusiness ? 'citas' : 'perfil') : 'inicio'

export const SECTIONS = S
