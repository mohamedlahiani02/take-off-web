import { defineConfig, devices } from '@playwright/test'

/**
 * The port/base URL are overridable so a verification run can use its own
 * server instead of colliding with a developer's `next dev` (Next holds a
 * per-directory dev lock, and a second instance refuses to start).
 */
const PORT = process.env['E2E_PORT'] ?? '3000'
/** Stand-in API for the server-rendered pages (see tests/fixtures/api-server.cjs). */
const FIXTURE_PORT = process.env['E2E_FIXTURE_PORT'] ?? '4599'
const FIXTURE_URL = `http://127.0.0.1:${FIXTURE_PORT}`
/** Set to 'chrome' to drive the installed Chrome instead of the bundled build. */
const CHANNEL = process.env['E2E_CHANNEL']
const BASE_URL = process.env['E2E_BASE_URL'] ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  // The prototype pages boot a runtime that pulls React from a CDN, which is
  // markedly slower on a cold CI runner than on a warm local browser cache.
  timeout: process.env['CI'] ? 90_000 : 30_000,
  expect: { timeout: process.env['CI'] ? 15_000 : 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    // Keeps a failing CI run diagnosable without re-running it locally.
    video: process.env['CI'] ? 'retain-on-failure' : 'off',
    navigationTimeout: process.env['CI'] ? 60_000 : 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...(CHANNEL ? { channel: CHANNEL } : {}) },
    },
  ],

  /**
   * Both servers are declared here so `pnpm test:e2e` behaves the same locally
   * and in CI. Starting them by hand is what made earlier runs fail: the two
   * API variables serve different consumers and are easy to mix up.
   */
  webServer: [
    {
      command: `node tests/fixtures/api-server.cjs ${FIXTURE_PORT}`,
      url: `${FIXTURE_URL}/api/v1/content/store`,
      reuseExistingServer: !process.env['CI'],
      timeout: 30_000,
    },
    {
      command: `pnpm exec next dev --hostname 127.0.0.1 --port ${PORT}`,
      url: BASE_URL,
      reuseExistingServer: !process.env['CI'],
      timeout: 180_000,
      env: {
        // Server Components fetch this one: the fixture API.
        API_URL: process.env['API_URL'] ?? FIXTURE_URL,
        // Injected into the prototype pages, so it must stay on the test origin
        // for the browser suites to intercept /api/v1/** themselves.
        NEXT_PUBLIC_API_URL: BASE_URL,
      },
    },
  ],
})
