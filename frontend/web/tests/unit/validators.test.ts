// Field checks of frontend/shared/validators.ts (SRS v1.2, 4.2 "Errores de
// formulario"; RN-02, RNF-W05). The app, the panel and the simulated
// database run these same checks.
import { describe, expect, it } from 'vitest'
import {
  LIMITS, checkBookingDate, checkEmail, checkHours, checkImage, checkLabel, checkName, checkPassword,
  checkPhone, checkPrice, checkStock, checkText, cleanSearch, collect, isEmail, parseAmount,
} from '@shared/validators'

const today = new Date(2026, 10, 12, 10, 0)

describe('checkName', () => {
  it('acepta nombres con acentos, ñ, apóstrofos y guiones', () => {
    for (const name of ['Andrea Valenzuela', 'Óscar Félix', 'Begoña Muñoz', "D'Angelo", 'Ana-Sofía', 'J. Pérez']) expect(checkName(name)).toBeNull()
  })
  it('pide el nombre y al menos 2 letras', () => {
    expect(checkName('   ')).toBe('Escribe tu nombre.')
    expect(checkName('A')).toBe('Escribe al menos 2 letras.')
  })
  it('rechaza números, etiquetas HTML y nombres demasiado largos', () => {
    expect(checkName('Andrea 2')).toMatch(/solo letras/)
    expect(checkName('<script>alert(1)</script>')).toMatch(/solo letras/)
    expect(checkName('a'.repeat(LIMITS.name + 1))).toBe(`Usa como máximo ${LIMITS.name} caracteres.`)
  })
})

describe('checkLabel', () => {
  it('acepta nombres de negocio con números y signos comunes', () => {
    expect(checkLabel('Barbería 24/7', LIMITS.businessName, 'Escribe el nombre.')).toBeNull()
    expect(checkLabel('Cera mate 100 g', LIMITS.productName, 'Escribe el nombre.')).toBeNull()
  })
  it('rechaza <, > y comillas', () => {
    expect(checkLabel('<b>Promo</b>', LIMITS.productName, 'x')).toMatch(/solo estos signos/)
    expect(checkLabel('Corte "VIP"', LIMITS.serviceName, 'x')).toMatch(/solo estos signos/)
  })
  it('usa el mensaje de vacío que le dan', () => {
    expect(checkLabel('  ', LIMITS.serviceName, 'Escribe el nombre del servicio.')).toBe('Escribe el nombre del servicio.')
  })
})

describe('checkText', () => {
  it('es opcional salvo que se pida', () => {
    expect(checkText('', LIMITS.review)).toBeNull()
    expect(checkText('  ', LIMITS.reason, 'Escribe el motivo.')).toBe('Escribe el motivo.')
  })
  it('respeta el límite exacto', () => {
    expect(checkText('a'.repeat(LIMITS.review), LIMITS.review)).toBeNull()
    expect(checkText('a'.repeat(LIMITS.review + 1), LIMITS.review)).toBe(`Usa como máximo ${LIMITS.review} caracteres.`)
  })
})

describe('correo', () => {
  it('acepta correos completos', () => {
    expect(checkEmail('andrea.valenzuela@gmail.com')).toBeNull()
    expect(isEmail('  martin.salazar@loscompas.mx  ')).toBe(true)
  })
  it('rechaza correos incompletos o vacíos', () => {
    expect(checkEmail('')).toBe('Escribe tu correo.')
    for (const bad of ['andrea', 'andrea@', 'andrea@gmail', '@gmail.com', 'andrea gmail.com']) expect(checkEmail(bad)).toMatch(/correo completo/)
  })
  it('rechaza correos de más de 254 caracteres', () => {
    expect(checkEmail(`${'a'.repeat(250)}@gmail.com`)).toBe(`Usa como máximo ${LIMITS.email} caracteres.`)
  })
})

describe('checkPhone', () => {
  it('acepta 10 dígitos con espacios o guiones', () => {
    expect(checkPhone('653 118 4420')).toBeNull()
    expect(checkPhone('653-118-4420')).toBeNull()
  })
  it('rechaza el +52, letras y largos distintos de 10', () => {
    expect(checkPhone('')).toBe('Escribe tu teléfono.')
    for (const bad of ['+52 653 118 4420', '65311844', '653118442a', '65311844200']) expect(checkPhone(bad)).toBe('El teléfono debe tener 10 dígitos, sin el +52.')
  })
})

describe('checkPassword', () => {
  it('pide 8 a 64 caracteres con una letra y un número', () => {
    expect(checkPassword('compas2025')).toBeNull()
    expect(checkPassword('corta1')).toBe('Usa al menos 8 caracteres.')
    expect(checkPassword('solamenteletras')).toBe('Usa al menos una letra y un número.')
    expect(checkPassword('12345678')).toBe('Usa al menos una letra y un número.')
    expect(checkPassword(`a1${'x'.repeat(63)}`)).toBe(`Usa como máximo ${LIMITS.password} caracteres.`)
  })
})

describe('precios y existencias', () => {
  it('lee montos escritos a mano', () => {
    expect(parseAmount('180')).toBe(180)
    expect(parseAmount('1,180.50')).toBe(1180.5)
    expect(parseAmount('18O')).toBeNaN()
    expect(parseAmount('1e3')).toBeNaN()
    expect(parseAmount('-5')).toBeNaN()
  })
  it('acepta precios de 0.01 a 99,999', () => {
    expect(checkPrice('180.50')).toBeNull()
    expect(checkPrice('99999')).toBeNull()
    expect(checkPrice('0')).toBe('El precio debe ser mayor que 0.')
    expect(checkPrice('100000')).toMatch(/no puede pasar/)
    expect(checkPrice('abc')).toMatch(/solo con números/)
    expect(checkPrice('10.999')).toMatch(/solo con números/)
  })
  it('acepta existencias enteras de 0 a 99,999', () => {
    expect(checkStock('0')).toBeNull()
    expect(checkStock(99999)).toBeNull()
    expect(checkStock('-1')).toMatch(/número entero/)
    expect(checkStock('2.5')).toMatch(/número entero/)
    expect(checkStock('100000')).toMatch(/No puede pasar/)
  })
})

describe('checkHours', () => {
  it('pide que el inicio vaya antes del fin', () => {
    expect(checkHours('10:00', '19:00')).toBeNull()
    expect(checkHours('19:00', '10:00')).toBe('La hora de inicio debe ser antes que la de fin.')
    expect(checkHours('10:00', '10:00')).toBe('La hora de inicio debe ser antes que la de fin.')
  })
  it('rechaza horas mal escritas', () => {
    expect(checkHours('24:00', '25:00')).toBe('Elige la hora de inicio y la de fin.')
    expect(checkHours('9:00', '18:00')).toBe('Elige la hora de inicio y la de fin.')
  })
})

describe('checkBookingDate (RN-02)', () => {
  it('acepta de hoy hasta dos meses adelante', () => {
    expect(checkBookingDate('2026-11-12', today)).toBeNull()
    expect(checkBookingDate('2027-01-12', today)).toBeNull()
  })
  it('rechaza el pasado, más de dos meses y fechas que no existen', () => {
    expect(checkBookingDate('2026-11-11', today)).toBe('Elige una fecha de hoy en adelante.')
    expect(checkBookingDate('2027-01-13', today)).toBe('Solo se reserva hasta 2 meses adelante.')
    expect(checkBookingDate('2026-02-30', today)).toBe('Elige una fecha válida.')
    expect(checkBookingDate('12/11/2026', today)).toBe('Elige una fecha válida.')
  })
})

describe('checkImage (RNF-W05)', () => {
  it('acepta JPG y PNG de hasta 5 MB', () => {
    expect(checkImage({ type: 'image/jpeg', size: 5 * 1024 * 1024 })).toBeNull()
    expect(checkImage({ type: 'image/png', size: 1000 })).toBeNull()
  })
  it('rechaza otros formatos y archivos más pesados', () => {
    expect(checkImage({ type: 'image/gif', size: 1000 })).toBe('Usa una imagen JPG o PNG.')
    expect(checkImage({ type: 'image/svg+xml', size: 1000 })).toBe('Usa una imagen JPG o PNG.')
    expect(checkImage({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toMatch(/más de 5 MB/)
  })
})

describe('utilidades', () => {
  it('cleanSearch corta a 60 caracteres y normaliza', () => {
    expect(cleanSearch('  FADE  ')).toBe('fade')
    expect(cleanSearch('x'.repeat(200))).toHaveLength(LIMITS.search)
  })
  it('collect deja solo los campos con error', () => {
    expect(collect({ name: null, email: 'Escribe tu correo.', phone: null })).toEqual({ email: 'Escribe tu correo.' })
  })
})
