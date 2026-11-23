import { expect, type BrowserContext, type Page } from '@playwright/test'
import type { DemoData } from '@shared/types'

export const APP_PASSWORD = 'compas2025'
export const PANEL_PASSWORD = 'snipp2026'

export const ANDREA = 'andrea.valenzuela@gmail.com'
export const MARTIN = 'martin.salazar@loscompas.mx'
export const ADMIN = 'admin@snipp.mx'
export const LUIS = 'luis.ortega@gmail.com'
export const SOFIA = 'sofia.ramos@gmail.com'

// Messages that mean a screen broke (the error screen or an uncaught error).
export const BROKEN = /Algo salió mal|Application error|Unhandled Runtime Error|TypeError/

// Starts from the sample data: clears what an earlier test left.
export async function freshData(context: BrowserContext) {
  const page = await context.newPage()
  await page.goto('/entrar')
  await page.evaluate(() => localStorage.clear())
  await page.close()
}

// Collects uncaught errors and console errors of a page.
export function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  return errors
}

// The app freezes its animations in a tab in the background, so every step
// brings its tab to the front first.
export async function open(page: Page, path: string) {
  await page.bringToFront()
  await page.goto(path)
}

export async function appSignIn(page: Page, email = ANDREA, password = APP_PASSWORD) {
  await open(page, '/app/entrar')
  const inputs = page.locator('input:visible')
  await inputs.nth(0).fill(email)
  await inputs.nth(1).fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

export async function panelSignIn(page: Page, email: string, password = PANEL_PASSWORD) {
  await open(page, '/entrar')
  await page.evaluate(() => localStorage.removeItem('snipp-session-panel'))
  await page.goto('/entrar')
  await page.getByLabel('Correo', { exact: true }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/panel/)
}

// Reads the shared database the app and the panel keep in localStorage.
export async function data<T>(page: Page, pick: (d: DemoData) => T): Promise<T> {
  const raw = await page.evaluate(() => localStorage.getItem('snipp-demo'))
  return pick(JSON.parse(raw ?? '{}').data)
}
