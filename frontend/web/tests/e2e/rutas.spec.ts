// Protected routes (RF-M02, RF-W04, RNF-G03): without a session nothing
// past Entrar opens, each platform takes only its own accounts, a role does
// not open another role's sections, and the session ends after 8 hours.
import { expect, test } from '@playwright/test'
import { ADMIN, ANDREA, APP_PASSWORD, LUIS, MARTIN, PANEL_PASSWORD, appSignIn, freshData, open, panelSignIn } from './helpers'

test.beforeEach(async ({ context }) => freshData(context))

test('la app sin sesión manda a Entrar', async ({ page }) => {
  for (const path of ['/app/inicio', '/app/citas', '/app/carrito', '/app/cuenta']) {
    await open(page, path)
    await expect(page, path).toHaveURL(/\/app\/entrar$/)
  }
})

test('el panel sin sesión manda a Entrar', async ({ page }) => {
  for (const path of ['/panel', '/panel/agenda', '/panel/negocios']) {
    await open(page, path)
    await expect(page, path).toHaveURL(/\/entrar$/)
  }
})

test('la app solo acepta clientes y el panel solo Jefes, Empleados y Administrador', async ({ page }) => {
  await appSignIn(page, MARTIN, PANEL_PASSWORD)
  await expect(page.getByText('El correo o la contraseña no coinciden')).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar$/)

  await open(page, '/entrar')
  await page.getByLabel('Correo', { exact: true }).fill(ANDREA)
  await page.getByLabel('Contraseña', { exact: true }).fill(APP_PASSWORD)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByText('El correo o la contraseña no coinciden')).toBeVisible()
  await expect(page).toHaveURL(/\/entrar$/)
})

test('con sesión, la app abre sus pantallas y Entrar lleva a Inicio', async ({ page }) => {
  await appSignIn(page)
  await expect(page).toHaveURL(/\/app\/inicio$/)
  await open(page, '/app/citas')
  await expect(page).toHaveURL(/\/app\/citas$/)
  await open(page, '/app/entrar')
  await expect(page).toHaveURL(/\/app\/inicio$/)
})

test('cada rol ve solo sus secciones del panel (RF-W04)', async ({ page }) => {
  const cases: [string, string[]][] = [
    [LUIS, ['negocios', 'planes', 'empleados', 'suscripcion', 'reportes']],
    [MARTIN, ['negocios', 'planes', 'resenas-reportadas']],
    [ADMIN, ['agenda', 'productos', 'empleados']],
  ]
  for (const [email, denied] of cases) {
    await panelSignIn(page, email)
    for (const section of denied) {
      await open(page, `/panel/${section}`)
      await expect(page.getByRole('heading', { name: 'No tienes acceso a esta sección' }), `${email} en ${section}`).toBeVisible()
    }
  }
})

test('la sesión vence a las 8 horas (RNF-G03)', async ({ page }) => {
  await appSignIn(page)
  await expect(page).toHaveURL(/\/app\/inicio$/)
  await panelSignIn(page, MARTIN)
  // Moves both sessions 8 hours into the past.
  await page.evaluate(() => {
    for (const key of ['snipp-session-app', 'snipp-session-panel']) {
      const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
      if (saved) localStorage.setItem(key, JSON.stringify({ ...saved, expiresAt: Date.now() - 1000 }))
    }
  })
  await open(page, '/app/citas')
  await expect(page).toHaveURL(/\/app\/entrar$/)
  await open(page, '/panel/agenda')
  await expect(page).toHaveURL(/\/entrar$/)
})
