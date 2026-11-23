// End-to-end stories with the app and the panel open side by side (two tabs
// of the same browser share the data, as in "Historia completa en dos
// pestañas" of the README). Each one starts from the sample data.
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { ADMIN, MARTIN, appSignIn, data, freshData, open, panelSignIn } from './helpers'

let app: Page
let panel: Page
let errors: string[]

async function twoTabs(context: BrowserContext, panelEmail = MARTIN) {
  await freshData(context)
  app = await context.newPage()
  panel = await context.newPage()
  await panel.setViewportSize({ width: 1280, height: 900 })
  errors = []
  app.on('pageerror', (e) => errors.push(`app: ${e.message}`))
  panel.on('pageerror', (e) => errors.push(`panel: ${e.message}`))
  await appSignIn(app)
  await expect(app).toHaveURL(/\/app\/inicio$/)
  await panelSignIn(panel, panelEmail)
}

test.afterEach(() => {
  expect(errors, 'errores en la página').toEqual([])
})

// Clicks the button named `name` inside the smallest element of the panel
// that contains `text` (a row of a list or a table).
async function clickIn(page: Page, text: string, name: RegExp) {
  // Waits until the list has loaded and the button is there.
  await expect.poll(() => page.evaluate(([t, src]) => {
    const re = new RegExp(src)
    const rows = [...document.querySelectorAll('li,tr,article,section,div')]
      .filter((e) => (e as HTMLElement).innerText.includes(t) && [...e.querySelectorAll('button')].some((b) => re.test(b.innerText.trim())))
      .sort((a, b) => (a as HTMLElement).innerText.length - (b as HTMLElement).innerText.length)
    const button = rows[0] && [...rows[0].querySelectorAll('button')].find((b) => re.test(b.innerText.trim()))
    button?.click()
    return !!button
  }, [text, name.source] as const), { message: `botón ${name} junto a «${text}»` }).toBe(true)
}

test('cita: la app reserva, el panel la cancela y la app recibe el aviso', async ({ context }) => {
  await twoTabs(context)
  await open(app, '/app/reservar?sucursal=los-compas-centro&servicio=fade&profesional=luis&fecha=2026-11-13')
  await app.getByRole('button', { name: /^\d{1,2}:\d\d\s?[ap]\.?\s?m\.?$/ }).last().click()
  await app.getByRole('button', { name: /^Continuar con las/ }).click()
  await app.getByRole('button', { name: 'Confirmar cita' }).click()
  await expect(app).toHaveURL(/C-\d+/)
  const folio = app.url().match(/C-\d+/)![0]

  await open(panel, '/panel/agenda')
  await panel.getByRole('button', { name: 'Día siguiente' }).click()
  await panel.getByRole('button', { name: /Andrea Valenzuela/ }).first().click()
  await panel.getByRole('button', { name: 'Cancelar cita' }).click()
  await panel.getByRole('button', { name: /^Sí, cancelar/ }).click()
  await expect.poll(() => data(panel, (d) => d.appointments.find((a) => a.folio === folio)?.status)).toBe('cancelada')

  await open(app, `/app/cita/${folio}`)
  await expect(app.getByText(/Cancelada por/).first()).toBeVisible()
  await open(app, '/app/notificaciones')
  await expect(app.getByText(/Los Compas Centro canceló tu cita/).first()).toBeVisible()
})

test('venta: la app paga, bajan las existencias, el panel lo prepara y la app lo ve', async ({ context }) => {
  await twoTabs(context)
  const stockBefore = await data(app, (d) => d.stock['los-compas-centro'].pomada as number)
  await open(app, '/app/tienda/los-compas-centro')
  await app.getByRole('button', { name: 'Agregar', exact: true }).first().click()
  // The bar at the bottom: "Ver carrito, 1 producto, $230".
  await app.getByRole('button', { name: /^Ver carrito \d/ }).click()
  await app.getByRole('button', { name: /^Pagar/ }).click()
  await expect(app).toHaveURL(/P-\d+/, { timeout: 20_000 })
  const folio = app.url().match(/P-\d+/)![0]
  expect(await data(app, (d) => d.stock['los-compas-centro'].pomada)).toBe(stockBefore - 1)
  expect(await data(app, (d) => d.points.some((m) => m.route === `/pedido/${folio}`))).toBe(true)

  await open(panel, `/panel/pedidos/${folio}`)
  await clickIn(panel, folio, /^Marcar listo/)
  await expect.poll(() => data(panel, (d) => d.orders.find((o) => o.folio === folio)?.status)).toBe('listo')

  await open(app, `/app/pedido/${folio}`)
  await expect(app.getByText('Listo para recoger').first()).toBeVisible()
  await open(app, '/app/notificaciones')
  await expect(app.getByText(new RegExp(`Tu pedido ${folio} está listo`)).first()).toBeVisible()
})

test('reembolso: el panel cancela un pedido y la app lo ve reembolsado', async ({ context }) => {
  await twoTabs(context)
  const stockBefore = await data(panel, (d) => d.stock['los-compas-centro'].aceite as number)
  await open(panel, '/panel/pedidos/P-2279')
  await panel.getByRole('button', { name: 'Cancelar y reembolsar' }).click()
  await panel.locator('textarea:visible').fill('Se dañó el frasco.')
  await panel.getByRole('button', { name: 'Sí, cancelar y reembolsar' }).click()
  await expect.poll(() => data(panel, (d) => d.orders.find((o) => o.folio === 'P-2279')?.status)).toBe('cancelado')
  expect(await data(panel, (d) => d.stock['los-compas-centro'].aceite)).toBeGreaterThan(stockBefore)

  await open(app, '/app/pedido/P-2279')
  await expect(app.getByText(/Cancelado · reembolsado/).first()).toBeVisible()
  await open(app, '/app/notificaciones')
  await expect(app.getByText(/canceló tu pedido P-2279/).first()).toBeVisible()
})

test('reseña y reporte: la app los envía y el Jefe los ve y responde', async ({ context }) => {
  await twoTabs(context)
  await open(app, '/app/calificar?cita=C-10431')
  await app.locator('[aria-label^="5 estrellas"]').click()
  await app.locator('textarea:visible').fill('Prueba de punta a punta, muy buen fade.')
  await app.getByRole('button', { name: 'Publicar reseña' }).click()
  await expect.poll(() => data(app, (d) => d.appointments.find((a) => a.folio === 'C-10431')?.review?.stars)).toBe(5)
  await open(panel, '/panel/resenas')
  await expect(panel.getByText('Prueba de punta a punta, muy buen fade.')).toBeVisible()

  await open(app, '/app/reportar?cita=C-10431')
  await app.getByText('Trato', { exact: true }).click()
  await app.locator('textarea:visible').fill('Prueba de reporte de punta a punta.')
  await app.getByRole('button', { name: 'Enviar reporte' }).click()
  await expect.poll(() => data(app, (d) => d.reports.find((r) => r.folio === 'C-10431')?.id ?? null)).not.toBeNull()
  const id = await data(app, (d) => d.reports.find((r) => r.folio === 'C-10431')!.id)

  await open(panel, `/panel/reportes/${id}`)
  await expect(panel.getByText('Prueba de reporte de punta a punta.')).toBeVisible()
  await panel.getByRole('button', { name: 'Pasar a en revisión' }).click()
  await open(app, '/app/reportes')
  await expect(app.getByText('En revisión').first()).toBeVisible()
})

test('reseña reportada: el Jefe la reporta, el Administrador la elimina y sale de la app', async ({ context }) => {
  await twoTabs(context)
  const text = /^Pésimo lugar, el barbero/
  await open(app, '/app/sucursal/los-compas-centro')
  await expect(app.getByText(text)).toBeVisible()

  await open(panel, '/panel/resenas')
  await clickIn(panel, 'Usuario 4821', /^Reportar al Administrador$/)
  await panel.getByRole('button', { name: 'Enviar reporte' }).click()
  await expect.poll(() => data(panel, (d) => d.reviews.find((r) => r.id === 'r6')?.reported?.state)).toBe('enviado')

  await panelSignIn(panel, ADMIN)
  await open(panel, '/panel/resenas-reportadas')
  await clickIn(panel, 'Usuario 4821', /^Eliminar reseña$/)
  await panel.getByRole('button', { name: 'Sí, eliminar' }).click()
  await expect.poll(() => data(panel, (d) => d.reviews.find((r) => r.id === 'r6')?.reported?.state)).toBe('eliminada')

  await open(app, '/app/sucursal/los-compas-centro')
  await expect(app.getByText('Llegué a las 5:30', { exact: false }).first()).toBeVisible()
  await expect(app.getByText(text)).toHaveCount(0)
})

test('solicitud: el Jefe acepta a Sofía y la app la ofrece para reservar', async ({ context }) => {
  await twoTabs(context)
  await open(panel, '/panel/empleados')
  await clickIn(panel, 'Sofía Ramos', /^Aceptar$/)
  await panel.getByRole('button', { name: 'Aceptar y vincular' }).click()
  await expect.poll(() => data(panel, (d) => d.employees.some((e) => e.email === 'sofia.ramos@gmail.com'))).toBe(true)
  await open(app, '/app/sucursal/los-compas-centro')
  await expect(app.getByText('Sofía Ramos').first()).toBeVisible()
})

test('suspensión: el Administrador suspende un negocio y la app deja de mostrarlo', async ({ context }) => {
  await twoTabs(context, ADMIN)
  await open(app, '/app/resultados')
  await expect(app.getByText('Estudio Marisol').first()).toBeVisible()

  await open(panel, '/panel/negocios')
  await clickIn(panel, 'Estudio Marisol', /^Suspender$/)
  await panel.getByRole('button', { name: 'Sí, suspender' }).click()
  await expect.poll(() => data(panel, (d) => d.businesses.find((b) => b.id === 'estudio-marisol')?.suspended)).toBe(true)
  await open(app, '/app/resultados')
  await expect(app.getByText('Los Compas Centro').first()).toBeVisible()
  await expect(app.getByText('Estudio Marisol')).toHaveCount(0)

  await open(panel, '/panel/negocios')
  await clickIn(panel, 'Estudio Marisol', /^Activar$/)
  await panel.getByRole('button', { name: 'Sí, activar' }).click()
  await expect.poll(() => data(panel, (d) => d.businesses.find((b) => b.id === 'estudio-marisol')?.suspended)).toBe(false)
  await open(app, '/app/resultados')
  await expect(app.getByText('Estudio Marisol').first()).toBeVisible()
})
