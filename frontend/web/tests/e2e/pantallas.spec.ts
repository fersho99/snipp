// Every screen of the app and the panel opens with the sample data, without
// the error screen nor errors in the console. Runs in Chrome and Edge
// (RNF-W03); the panel also on a tablet (RNF-W03) and the app screens (@app)
// on a 360 px phone (RNF-M04), where nothing may scroll sideways.
import { expect, test, type Page } from '@playwright/test'
import { ADMIN, BROKEN, LUIS, MARTIN, SOFIA, appSignIn, freshData, open, panelSignIn, watchErrors } from './helpers'

test.beforeEach(async ({ context }) => freshData(context))

const APP = [
  '/app/inicio', '/app/resultados?q=fade', '/app/sucursal/los-compas-centro', '/app/reservar?sucursal=los-compas-norte',
  '/app/citas', '/app/cita/C-10482', '/app/cambio/C-10490', '/app/tienda/los-compas-centro',
  '/app/producto/pomada?sucursal=los-compas-centro', '/app/carrito', '/app/pedidos', '/app/pedido/P-2279',
  '/app/puntos', '/app/notificaciones', '/app/reportes', '/app/calificar?cita=C-10431', '/app/cuenta', '/app/perfil',
]

async function check(page: Page, path: string, errors: string[], narrow: boolean) {
  const before = errors.length
  await open(page, path)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('body'), path).not.toContainText(BROKEN)
  expect(errors.slice(before), `${path}: errores en consola`).toEqual([])
  if (narrow) {
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(wide, `${path}: se sale de lado`).toBeLessThanOrEqual(0)
  }
}

test('pantallas de la app @app', async ({ page }, info) => {
  const errors = watchErrors(page)
  await appSignIn(page)
  await expect(page).toHaveURL(/\/app\/inicio$/)
  for (const path of APP) await check(page, path, errors, info.project.name === 'movil-360')
})

test('pantallas del panel', async ({ page }, info) => {
  const errors = watchErrors(page)
  const byAccount: [string, string[]][] = [
    [MARTIN, ['inicio', 'agenda', 'empleados', 'empleados/luis', 'sucursales', 'sucursales/los-compas-centro', 'productos', 'pedidos', 'pedidos/P-2279', 'reportes', 'reportes/R-119', 'resenas', 'puntos', 'suscripcion']],
    [ADMIN, ['negocios', 'planes', 'resenas-reportadas']],
    [LUIS, ['citas', 'perfil', 'historial', 'pedidos']],
    [SOFIA, ['perfil']],
  ]
  for (const [email, sections] of byAccount) {
    await panelSignIn(page, email)
    for (const s of sections) await check(page, `/panel/${s}`, errors, info.project.name === 'tableta')
  }
})
