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

// Visible elements that go past the left or right edge of the screen. The
// app (React Native Web) scrolls inside its own containers, which cut what
// goes past them, so the width of the document alone never grows: each
// element is measured instead. A row that scrolls sideways on purpose (a
// container with overflow-x auto or scroll) is allowed.
function outsideTheScreen() {
  const width = window.innerWidth
  const scrollsSideways = (e: Element | null): boolean => {
    for (let p = e; p; p = p.parentElement) {
      const { overflowX } = getComputedStyle(p)
      if ((overflowX === 'auto' || overflowX === 'scroll') && p.scrollWidth > p.clientWidth) return true
    }
    return false
  }
  return [...document.querySelectorAll('body *')]
    .filter((e) => {
      const r = e.getBoundingClientRect()
      const s = getComputedStyle(e)
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0' && (r.right > width + 1 || r.left < -1)
    })
    .filter((e) => !scrollsSideways(e.parentElement))
    .slice(0, 5)
    .map((e) => `<${e.tagName.toLowerCase()}> «${((e as HTMLElement).innerText || '').slice(0, 40)}»`)
}

async function check(page: Page, path: string, errors: string[], narrow: boolean) {
  const before = errors.length
  await open(page, path)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('body'), path).not.toContainText(BROKEN)
  expect(errors.slice(before), `${path}: errores en consola`).toEqual([])
  if (narrow) expect(await page.evaluate(outsideTheScreen), `${path}: se sale de lado`).toEqual([])
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
