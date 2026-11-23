// Business rules of frontend/shared/rules.ts, checked against the sample
// data (shared/seed.ts). Today is Thursday 12 November 2026, 10:00 am.
import { beforeEach, describe, expect, it } from 'vitest'
import {
  bookingProblem, businessVisible, cartProblem, clientChangeProblem, panelChangeProblem,
  paymentProblem, pointsProblem, quantityProblem, reportProblem, reviewProblem, slotProblem,
} from '@shared/rules'
import { seedData } from '@shared/seed'
import type { Account, Appointment, DemoData } from '@shared/types'

const today = new Date(2026, 10, 12, 10, 0)
let d: DemoData
const account = (email: string) => d.accounts.find((a) => a.email === email) as Account
const appt = (folio: string) => d.appointments.find((a) => a.folio === folio) as Appointment
const andrea = () => account('andrea.valenzuela@gmail.com')
const martin = () => account('martin.salazar@loscompas.mx')

// Andrea's fade with Luis on Thursday 19 November at 5:30 pm.
const C10482 = 'C-10482'
// A day with no appointments nor blocks of Luis, so the slot is free.
const FREE_DAY = '2026-12-01'
const slot = (over: Partial<Appointment> = {}) => ({ branchId: 'los-compas-centro', employeeId: 'luis', serviceId: 'fade', date: FREE_DAY, start: 12 * 60, ...over })

beforeEach(() => {
  d = seedData()
  d.appointments = d.appointments.filter((a) => !(a.employeeId === 'luis' && a.date === FREE_DAY))
  d.blocks = d.blocks.filter((b) => !(b.employeeId === 'luis' && b.from.startsWith(FREE_DAY)))
})

describe('businessVisible (RN-13, RF-W28)', () => {
  it('muestra un negocio al corriente y oculta uno vencido o suspendido', () => {
    const by = (id: string) => d.businesses.find((b) => b.id === id)
    expect(businessVisible(by('los-compas'), today)).toBe(true)
    expect(businessVisible(by('el-faro'), today)).toBe(false)
    expect(businessVisible(by('unas-coral'), today)).toBe(false)
    expect(businessVisible(undefined, today)).toBe(false)
  })
})

describe('reservar (RF-M06, RN-01, RN-02, RN-14)', () => {
  it('acepta una hora libre', () => {
    expect(bookingProblem(d, slot(), andrea(), today)).toBeNull()
  })
  it('solo reserva un cliente con sesión', () => {
    expect(bookingProblem(d, slot(), null, today)?.code).toBe('forbidden')
    expect(bookingProblem(d, slot(), martin(), today)?.code).toBe('forbidden')
  })
  it('no encima de otra cita del mismo profesional (RN-01)', () => {
    const p = bookingProblem(d, slot({ date: '2026-11-19', start: 17 * 60 + 45 }), andrea(), today)
    expect(p).toEqual({ code: 'conflict', message: 'Ese horario ya está ocupado. Elige otro.' })
  })
  it('no en un horario bloqueado', () => {
    d.blocks.push({ id: 'b-test', employeeId: 'luis', from: `${FREE_DAY}T11:00`, to: `${FREE_DAY}T14:00`, reason: 'Prueba' } as DemoData['blocks'][number])
    expect(bookingProblem(d, slot(), andrea(), today)?.code).toBe('conflict')
  })
  it('no en el pasado ni a más de dos meses (RN-02)', () => {
    expect(bookingProblem(d, slot({ date: '2026-11-12', start: 9 * 60 }), andrea(), today)?.message).toBe('Esa hora ya pasó. Elige otra.')
    expect(bookingProblem(d, slot({ date: '2027-01-20' }), andrea(), today)?.message).toBe('Solo se reserva hasta 2 meses adelante.')
  })
  it('no en un negocio vencido, suspendido o en una sucursal inactiva', () => {
    const faro = d.branches.find((b) => b.businessId === 'el-faro')!
    const coral = d.branches.find((b) => b.businessId === 'unas-coral')!
    expect(bookingProblem(d, slot({ branchId: faro.id, serviceId: faro.serviceIds[0] }), andrea(), today)?.message).toBe('Este negocio no está recibiendo reservas.')
    expect(bookingProblem(d, slot({ branchId: coral.id, serviceId: coral.serviceIds[0] }), andrea(), today)?.message).toBe('Este negocio no está recibiendo reservas.')
    d.branches = d.branches.map((b) => (b.id === 'los-compas-centro' ? { ...b, active: false } : b))
    expect(bookingProblem(d, slot(), andrea(), today)?.code).toBe('invalid')
  })
  it('no un servicio inactivo ni un profesional de otra sucursal (RN-14)', () => {
    d.branches = d.branches.map((b) => (b.id === 'los-compas-centro' ? { ...b, inactiveServiceIds: ['fade'] } : b))
    expect(bookingProblem(d, slot(), andrea(), today)?.message).toBe('Este servicio no se ofrece en esta sucursal.')
    expect(slotProblem(d, slot({ employeeId: 'oscar' }), today)?.message).toBe('Ese profesional no trabaja en esta sucursal.')
  })
  it('no con un profesional dado de baja', () => {
    d.employees = d.employees.map((e) => (e.id === 'luis' ? { ...e, status: 'baja' } : e))
    expect(bookingProblem(d, slot(), andrea(), today)?.message).toBe('Ese profesional no recibe citas.')
  })
})

describe('cambios del cliente (RN-03, RN-04)', () => {
  it('cancela su cita con anticipación', () => {
    expect(clientChangeProblem(d, appt(C10482), { status: 'cancelada', cancelledBy: 'cliente' }, andrea(), today)).toBeNull()
  })
  it('no cambia la cita de otra persona', () => {
    expect(clientChangeProblem(d, appt(C10482), { status: 'cancelada', cancelledBy: 'cliente' }, account('cliente.nuevo@gmail.com'), today)?.code).toBe('forbidden')
  })
  it('no cancela con menos de 2 horas (RN-03)', () => {
    const late = new Date(2026, 10, 19, 16, 0)
    expect(clientChangeProblem(d, appt(C10482), { status: 'cancelada', cancelledBy: 'cliente' }, andrea(), late)?.message).toMatch(/faltan menos de 2 horas/)
  })
  it('respeta la anticipación que fija el negocio (RF-W08)', () => {
    d.businesses = d.businesses.map((b) => (b.id === 'los-compas' ? { ...b, minNoticeHours: 1 } : b))
    expect(clientChangeProblem(d, appt(C10482), { status: 'cancelada', cancelledBy: 'cliente' }, andrea(), new Date(2026, 10, 19, 16, 0))).toBeNull()
  })
  it('no toca datos ni estados que solo cambia el negocio', () => {
    expect(clientChangeProblem(d, appt(C10482), { status: 'atendida' }, andrea(), today)?.code).toBe('forbidden')
    expect(clientChangeProblem(d, appt(C10482), { status: 'cancelada', cancelledBy: 'Jefe' }, andrea(), today)?.code).toBe('forbidden')
    expect(clientChangeProblem(d, appt(C10482), { clientEmail: 'otra@gmail.com' }, andrea(), today)?.code).toBe('forbidden')
  })
  it('reagenda solo a una hora libre', () => {
    expect(clientChangeProblem(d, appt(C10482), { date: FREE_DAY, start: 12 * 60, status: 'confirmada' }, andrea(), today)).toBeNull()
    const other = d.appointments.find((a) => a.employeeId === 'luis' && a.folio !== C10482 && a.status === 'confirmada' && a.date > '2026-11-12')!
    expect(clientChangeProblem(d, appt(C10482), { date: other.date, start: other.start, status: 'confirmada' }, andrea(), today)?.code).toBe('conflict')
  })
})

describe('cambios desde el panel (RF-W16 a RF-W18)', () => {
  it('el Jefe pasa la cita a otro profesional libre', () => {
    const before = appt(C10482)
    const next = { ...before, employeeId: 'ramon', status: 'cambio' as const }
    d.appointments = d.appointments.filter((a) => !(a.employeeId === 'ramon' && a.date === before.date))
    expect(panelChangeProblem(d, before, next, martin(), today)).toBeNull()
  })
  it('el Jefe de otro negocio no la cambia', () => {
    const before = appt(C10482)
    expect(panelChangeProblem(d, before, { ...before, status: 'cancelada' }, account('jefe.vencido@elfaro.mx'), today)?.code).toBe('forbidden')
  })
  it('un Empleado solo cambia sus citas y no las pasa a otro', () => {
    const before = appt(C10482)
    expect(panelChangeProblem(d, before, { ...before, status: 'cancelada' }, account('oscar.felix@gmail.com'), today)?.message).toBe('Solo puedes cambiar tus propias citas.')
    expect(panelChangeProblem(d, before, { ...before, employeeId: 'ramon' }, account('luis.ortega@gmail.com'), today)?.message).toBe('Solo el Jefe pasa una cita a otro profesional.')
  })
  it('no marca como atendida una cita que no ha empezado', () => {
    const before = appt(C10482)
    expect(panelChangeProblem(d, before, { ...before, status: 'atendida' }, martin(), today)?.message).toBe('Ese estado se marca cuando la cita ya empezó.')
  })
  it('no cambia el cliente ni el precio de la cita', () => {
    const before = appt(C10482)
    expect(panelChangeProblem(d, before, { ...before, clientEmail: 'otra@gmail.com' }, martin(), today)?.code).toBe('forbidden')
  })
  it('un cliente o el Administrador no cambian citas', () => {
    const before = appt(C10482)
    expect(panelChangeProblem(d, before, { ...before, status: 'cancelada' }, andrea(), today)?.code).toBe('forbidden')
    expect(panelChangeProblem(d, before, { ...before, status: 'cancelada' }, account('admin@snipp.mx'), today)?.code).toBe('forbidden')
  })
})

describe('reseñas y reportes (RN-08, RN-15)', () => {
  const attended = () => appt('C-10431')
  it('una reseña de 1 a 5 estrellas por cita atendida', () => {
    expect(reviewProblem(attended(), { stars: 5, text: 'Muy buen fade.' })).toBeNull()
    expect(reviewProblem(attended(), { stars: 6, text: '' })?.message).toBe('Elige de 1 a 5 estrellas.')
    expect(reviewProblem(attended(), { stars: 4, text: 'a'.repeat(501) })?.code).toBe('invalid')
    expect(reviewProblem(appt('C-10402'), { stars: 4, text: '' })?.code).toBe('conflict')
    expect(reviewProblem(appt(C10482), { stars: 4, text: '' })?.message).toBe('Solo puedes calificar una cita atendida.')
  })
  it('un reporte con motivo válido por cita atendida', () => {
    expect(reportProblem(attended(), { reason: 'trato', text: 'Me trataron mal.' } as Appointment['report'])).toBeNull()
    expect(reportProblem(attended(), { reason: 'otra-cosa', text: '' } as unknown as Appointment['report'])?.message).toBe('Elige el motivo del reporte.')
    expect(reportProblem(appt(C10482), { reason: 'trato', text: '' } as Appointment['report'])?.code).toBe('invalid')
  })
})

describe('tienda (RN-06, RN-07, RN-09, RN-20)', () => {
  it('máximo 3 carritos abiertos, uno por sucursal', () => {
    expect(cartProblem(['a', 'b'], 'c')).toBeNull()
    expect(cartProblem(['a', 'b', 'c'], 'a')).toBeNull()
    expect(cartProblem(['a', 'b', 'c'], 'd')?.code).toBe('conflict')
  })
  it('piezas enteras y nunca más de las que hay', () => {
    expect(quantityProblem(2, 3)).toBeNull()
    expect(quantityProblem(4, 3)?.message).toBe('Solo hay 3 piezas.')
    expect(quantityProblem(1, 0)?.message).toBe('Este producto se agotó.')
    expect(quantityProblem(1.5, 3)?.code).toBe('invalid')
  })
  it('puntos enteros, hasta el saldo y hasta el total', () => {
    expect(pointsProblem(27, 27, 230)).toBeNull()
    expect(pointsProblem(28, 27, 230)?.message).toBe('No tienes tantos puntos en este negocio.')
    expect(pointsProblem(27, 100, 20)?.message).toBe('Los puntos no pueden pasar del total de la compra.')
    expect(pointsProblem(-1, 27, 230)?.code).toBe('invalid')
  })
  it('el mismo pago no crea dos pedidos', () => {
    expect(paymentProblem(['pi_1'], 'pi_2')).toBeNull()
    expect(paymentProblem(['pi_1'], 'pi_1')?.code).toBe('conflict')
    expect(paymentProblem([], '')?.code).toBe('invalid')
  })
})
