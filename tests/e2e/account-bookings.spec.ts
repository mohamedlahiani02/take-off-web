import { test, expect, devices } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'

/**
 * The member's bookings page, including cancellation.
 *
 * The page had no cancel action at all, so a member could only phone the club.
 * Eligibility is decided by the server and published on each row; these cases
 * pin that the page obeys it rather than re-deriving the deadline, and that a
 * refusal is shown as the server worded it.
 *
 * The account layout authenticates on the server, so this runs against
 * tests/fixtures/api-server.cjs through the real proxy chain rather than
 * stubbing in the browser. Per-test options travel in the session token, which
 * keeps the cases independent of each other.
 */

const BASE = process.env['E2E_BASE_URL'] ?? 'http://localhost:3000'

interface Opts {
  canCancel?: boolean
  blockedReason?: string
  paymentStatus?: string
  isOrganizer?: boolean
  cancelStatus?: number
  cancelDetail?: string
}

/** Signs the browser in, encoding this test's scenario in the token. */
async function signIn(context: BrowserContext, opts: Opts = {}) {
  const parts = ['fixture']
  if (opts.canCancel === false) parts.push('canCancel=false')
  if (opts.blockedReason) parts.push('blockedReason=' + opts.blockedReason)
  if (opts.paymentStatus) parts.push('paymentStatus=' + opts.paymentStatus)
  if (opts.isOrganizer === false) parts.push('isOrganizer=false')
  if (opts.cancelStatus) parts.push('cancelStatus=' + opts.cancelStatus)
  if (opts.cancelDetail) parts.push('cancelDetail=' + opts.cancelDetail)
  await context.addCookies([
    { name: 'takeoff_session', value: parts.join('|'), url: BASE, httpOnly: true },
  ])
}

/** DELETEs the page actually sent, so "cancelled nothing" is provable. */
function recordDeletes(page: Page): string[] {
  const seen: string[] = []
  page.on('request', (r) => {
    if (r.method() === 'DELETE' && r.url().includes('/api/courts/bookings/')) {
      seen.push(new URL(r.url()).pathname)
    }
  })
  return seen
}

for (const [label, viewport] of [
  ['desktop', { width: 1440, height: 1000 }],
  ['mobile', devices['Pixel 5'].viewport!],
] as const)
for (const tz of ['Africa/Tunis', 'Europe/Paris'] as const) {
  test.describe(`${label}/${tz} — account bookings`, () => {
    test.use({ viewport, timezoneId: tz })

    test('a booking shows its club time and its payment state', async ({ page, context }) => {
      await signIn(context)
      await page.goto('/account/bookings')

      const row = page.locator('[data-booking-id="bk-1"]')
      await expect(row).toBeVisible()
      // Never collected, so never dressed up as paid.
      await expect(row).toContainText('À régler au club')
      await expect(row).not.toContainText('Payé')
    })

    test('cancelling takes two steps and calls the server once', async ({ page, context }) => {
      await signIn(context)
      const deletes = recordDeletes(page)
      await page.goto('/account/bookings')

      // The first press only asks for confirmation — cancelling is not undoable.
      await page.locator('[data-cancel-for="bk-1"]').click()
      await expect(page.locator('[data-confirm-cancel="bk-1"]')).toBeVisible()
      expect(deletes).toEqual([])

      await page.locator('[data-confirm-cancel="bk-1"]').click()
      await expect(page.locator('[data-booking-id="bk-1"]')).toContainText('Annulé')
      expect(deletes).toEqual(['/api/courts/bookings/bk-1'])
    })

    test('backing out of the confirmation cancels nothing', async ({ page, context }) => {
      await signIn(context)
      const deletes = recordDeletes(page)
      await page.goto('/account/bookings')

      await page.locator('[data-cancel-for="bk-1"]').click()
      await page.getByRole('button', { name: 'NON' }).click()
      await expect(page.locator('[data-cancel-for="bk-1"]')).toBeVisible()
      expect(deletes).toEqual([])
    })

    test('the server verdict is obeyed, and its wording shown', async ({ page, context }) => {
      await signIn(context, {
        canCancel: false,
        blockedReason: 'Cancelling is only possible up to 24 hours before the match. Call the club.',
      })
      await page.goto('/account/bookings')

      // The page does not re-derive the rule; there is simply no button.
      await expect(page.locator('[data-cancel-blocked="bk-1"]')).toContainText('24 hours')
      await expect(page.locator('[data-cancel-blocked="bk-1"]')).toContainText('club')
      await expect(page.locator('[data-cancel-for="bk-1"]')).toHaveCount(0)
    })

    test('a refused cancellation reports the reason and stays uncancelled', async ({ page, context }) => {
      await signIn(context, { cancelStatus: 400, cancelDetail: 'Trop tard pour annuler.' })
      await page.goto('/account/bookings')

      await page.locator('[data-cancel-for="bk-1"]').click()
      await page.locator('[data-confirm-cancel="bk-1"]').click()

      await expect(page.locator('#bk-error')).toContainText('Trop tard')
      await expect(page.locator('[data-booking-id="bk-1"]')).not.toContainText('Annulé')
    })

    test('a seated player is offered to leave, not to cancel', async ({ page, context }) => {
      await signIn(context, { isOrganizer: false })
      await page.goto('/account/bookings')

      await expect(page.locator('[data-cancel-for="bk-1"]')).toContainText('QUITTER')
    })
  })
}
