import { test, expect, devices } from '@playwright/test'

/**
 * The public detail pages. These routes previously returned the *general* page
 * and ignored their parameter, so a shared product/coach/tournament link showed
 * the wrong content and carried no metadata.
 *
 * These pages are Server Components: their fetches leave the Node process, so
 * browser-level routing cannot stub them. The suite therefore runs against
 * tests/fixtures/api-server.cjs, which the web server must be pointed at with
 * API_URL. Nothing reaches a real backend.
 */

const { IDS } = require('../fixtures/api-server.cjs') as {
  IDS: Record<string, string>
}

const PRODUCT_ID = IDS['product']!
const PRODUCT_SOLD_OUT = IDS['productSoldOut']!
const PRODUCT_INACTIVE = IDS['productInactive']!
const COACH_ID = IDS['coach']!
const TOURNAMENT_ID = IDS['tournament']!
const TOURNAMENT_FULL = IDS['tournamentFull']!
const TOURNAMENT_CANCELLED = IDS['tournamentCancelled']!
const MISSING_ID = IDS['missing']!
const OUTAGE_ID = IDS['outage']!

for (const [label, viewport] of [
  ['mobile', devices['Pixel 5'].viewport!],
  ['desktop', { width: 1440, height: 1000 }],
] as const) {
  test.describe(`${label} — detail pages`, () => {
    test.use({ viewport, timezoneId: 'Africa/Tunis' })

    test('a product page shows that product and its metadata', async ({ page }) => {
      await page.goto(`/store/raquette-test-pro--${PRODUCT_ID}`)

      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Raquette Test Pro')
      await expect(page).toHaveTitle(/Raquette Test Pro/)
      await expect(page.locator('body')).toContainText('349.500 DT')
      await expect(page.locator('body')).toContainText('En stock')
      await expect(page.getByRole('button', { name: 'Ajouter au panier' })).toBeVisible()
    })

    test('adding a product from its page reaches the cart', async ({ page }) => {
      await page.goto(`/store/raquette-test-pro--${PRODUCT_ID}`)

      await page.getByRole('button', { name: 'Ajouter au panier' }).click()
      await expect(page.getByRole('button', { name: /Cart \(1 items\)/ })).toBeVisible()

      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('takeOffCart') ?? '[]'))
      expect(stored).toHaveLength(1)
      expect(stored[0].productId).toBe(PRODUCT_ID)
      expect(stored[0].kind).toBe('product')
    })

    test('a sold-out product cannot be added', async ({ page }) => {
      await page.goto(`/store/raquette-test-pro--${PRODUCT_SOLD_OUT}`)

      await expect(page.locator('body')).toContainText('ÉPUISÉ')
      await expect(page.getByRole('button', { name: 'Ajouter au panier' })).toHaveCount(0)
    })

    test('a coach page shows that coach and links to siblings', async ({ page }) => {
      await page.goto(`/coaches/amel-fixture--${COACH_ID}`)

      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Amel Fixture')
      await expect(page).toHaveTitle(/Amel Fixture/)
      await expect(page.locator('body')).toContainText('Champion regional 2024')
      await expect(page.locator('body')).toContainText('Technique')
      // The other coach is offered, and the coach themselves is not repeated.
      await expect(page.getByRole('link', { name: /Karim Second/ })).toBeVisible()
    })

    test('a tournament page shows capacity and an open registration', async ({ page }) => {
      await page.goto(`/padel/tournaments/coupe-de-test--${TOURNAMENT_ID}`)

      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Coupe de Test')
      await expect(page.locator('body')).toContainText('5')
      await expect(page.locator('body')).toContainText('11 place(s) restante(s)')
      await expect(page.getByRole('link', { name: 'S’inscrire' })).toBeVisible()
    })

    test('a full tournament does not offer registration', async ({ page }) => {
      await page.goto(`/padel/tournaments/coupe-de-test--${TOURNAMENT_FULL}`)

      await expect(page.locator('body')).toContainText('Complet')
      await expect(page.getByRole('link', { name: 'S’inscrire' })).toHaveCount(0)
    })

    test('a cancelled tournament says so instead of taking registrations', async ({ page }) => {
      await page.goto(`/padel/tournaments/coupe-de-test--${TOURNAMENT_CANCELLED}`)

      await expect(page.locator('body')).toContainText('ANNULÉ')
      await expect(page.getByRole('link', { name: 'S’inscrire' })).toHaveCount(0)
    })

    test('an unknown id is a 404, not the general page', async ({ page }) => {
      const res = await page.goto(`/store/whatever--${MISSING_ID}`)
      expect(res?.status()).toBe(404)
    })

    test('an outage reads as unavailable, not as missing content', async ({ page }) => {
      await page.goto(`/coaches/amel-fixture--${OUTAGE_ID}`)

      await expect(page.locator('body')).toContainText('indisponible')
      // An outage must not be reported as a 404.
      await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Amel Fixture')
    })

    test('an inactive product is not published', async ({ page }) => {
      const res = await page.goto(`/store/raquette-test-pro--${PRODUCT_INACTIVE}`)
      expect(res?.status()).toBe(404)
    })

    test('a malformed segment is a 404', async ({ page }) => {
      const res = await page.goto('/store/not-an-id')
      expect(res?.status()).toBe(404)
    })
  })
}
