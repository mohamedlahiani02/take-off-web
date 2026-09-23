import { defineConfig, devices } from '@playwright/test'

/**
 * The port/base URL are overridable so a verification run can use its own
 * server instead of colliding with a developer's `next dev` (Next holds a
 * per-directory dev lock, and a second instance refuses to start).
 */
const PORT = process.env['E2E_PORT'] ?? '3000'
/** Set to 'chrome' to drive the installed Chrome instead of the bundled build. */
const CHANNEL = process.env['E2E_CHANNEL']
const BASE_URL = process.env['E2E_BASE_URL'] ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...(CHANNEL ? { channel: CHANNEL } : {}) },
    },
  ],

  webServer: {
    command: `pnpm exec next dev --hostname 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
    // The prototype reads window.TAKEOFF_API_URL from this; pointing it at the
    // test origin lets specs intercept /api/v1/** with controlled fixtures.
    env: { NEXT_PUBLIC_API_URL: BASE_URL },
  },
})
