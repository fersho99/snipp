import { defineConfig, devices } from '@playwright/test'

// End-to-end tests of the app (/app) and the panel together, on the
// production build (see frontend/README.md, "Pruebas"). One worker: every
// test starts from the sample data and the two tabs share localStorage.
const PORT = 3100

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-MX',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // The app export and the build are made by `npm run test:e2e`.
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/entrar`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    // RNF-W03: Chrome and Edge (Firefox is checked by hand, see the README).
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' }, testMatch: /(rutas|pantallas)\.spec\.ts/ },
    // RNF-W03: the panel on a tablet.
    { name: 'tableta', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 820, height: 1180 }, hasTouch: true }, testMatch: /pantallas\.spec\.ts/, grepInvert: /@app/ },
    // RNF-M04: the app on a 360 px wide phone.
    { name: 'movil-360', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 360, height: 740 }, hasTouch: true }, testMatch: /pantallas\.spec\.ts/, grep: /@app/ },
  ],
})
