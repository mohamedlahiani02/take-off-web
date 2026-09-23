import { test, expect, devices } from '@playwright/test'

/**
 * /store and /coaches, now Server Components instead of prototype HTML.
 *
 * Two things these tests exist to pin down:
 *  - the catalogue links to the detail pages (there was no way to reach them);
 *  - the CMS is actually read. The prototype stored the SiteContent *list* and
 *    then looked up `cms.hero`, which is undefined on an array, so every edit
 *    made in the admin was silently ignored. The fixture serves copy that
 *    differs from the built-in defaults, so a default rendering fails here.
 *
 * Runs against tests/fixtures/api-server.cjs (these pages fetch server-side).
 */

const { IDS } = require('../fixtures/api-server.cjs') as { IDS: Record<string, string> }

for (const [label, viewport] of [
  ['mobile', devices['Pixel 5'].viewport!],
  ['desktop', { width: 1440, height: 1000 }],
] as const) {
  test.describe(`${label} — store list`, () => {
    test.use({ viewport, timezoneId: 'Africa/Tunis' })

    test('renders CMS copy, not the built-in defaults', async ({ page }) => {
      await page.goto('/store')
      await expect(page.getByRole('heading', { level: 1 })).toContainText('CMS Headline Store')
      await expect(page.locator('body')).toContainText('CMS KICKER STORE')
      await expect(page.locator('body')).toContainText('CMS subtitle store.')
      await expect(page).toHaveTitle(/CMS Headline Store/)
    })

    test('products link to their own page', async ({ page }) => {
      await page.goto('/store')

      const link = page.getByRole('link', { name: /Raquette Test Pro/ })
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('href', new RegExp(`--${IDS['product']}$`))

      await link.click()
      await expect(page).toHaveURL(new RegExp(`/store/.*--${IDS['product']}$`))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Raquette Test Pro')
    })

    test('inactive products are not listed', async ({ page }) => {
      await page.goto('/store')
      await expect(page.locator('body')).not.toContainText('Produit Retire')
    })

    test('a sold-out product is listed but marked', async ({ page }) => {
      await page.goto('/store')
      const card = page.getByRole('link', { name: /Sac Epuise/ })
      await expect(card).toBeVisible()
      await expect(card).toContainText('ÉPUISÉ')
    })

    test('category filter and search react to real clicks', async ({ page }) => {
      await page.goto('/store')

      await page.getByRole('button', { name: 'Accessoires' }).click()
      await expect(page.getByRole('link', { name: /Sac Epuise/ })).toBeVisible()
      await expect(page.getByRole('link', { name: /Raquette Test Pro/ })).toHaveCount(0)

      await page.getByRole('button', { name: 'Tout' }).click()
      await expect(page.getByRole('link', { name: /Raquette Test Pro/ })).toBeVisible()

      await page.getByPlaceholder('Rechercher…').fill('raquette')
      await expect(page.getByRole('link', { name: /Raquette Test Pro/ })).toBeVisible()
      await expect(page.getByRole('link', { name: /Sac Epuise/ })).toHaveCount(0)

      await page.getByPlaceholder('Rechercher…').fill('zzzz')
      await expect(page.locator('body')).toContainText('Aucun produit ne correspond')
    })
  })

  test.describe(`${label} — coaches list`, () => {
    test.use({ viewport, timezoneId: 'Africa/Tunis' })

    test('renders CMS copy and hides invisible sections', async ({ page }) => {
      await page.goto('/coaches')
      await expect(page.getByRole('heading', { level: 1 })).toContainText('CMS Headline Coaches')
      await expect(page.locator('body')).toContainText('CMS Form Headline')
      // visible:false must not reach the page.
      await expect(page.locator('body')).not.toContainText('SHOULD NOT APPEAR')
    })

    test('coaches link to their own page', async ({ page }) => {
      await page.goto('/coaches')

      const link = page.getByRole('link', { name: /Amel Fixture/ }).first()
      await expect(link).toHaveAttribute('href', new RegExp(`--${IDS['coach']}$`))

      await link.click()
      await expect(page).toHaveURL(new RegExp(`/coaches/.*--${IDS['coach']}$`))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Amel Fixture')
    })

    test('the coaching form submits and confirms only on success', async ({ page }) => {
      await page.goto('/coaches')

      await page.getByPlaceholder('Votre nom').fill('Test Member')
      await page.getByPlaceholder('+216 XX XXX XXX').fill('+21622000000')
      await page.getByPlaceholder('vous@exemple.com').fill('test@example.test')
      await page.getByRole('button', { name: 'Padel', exact: true }).click()
      await page.getByRole('button', { name: 'Lun Matin' }).click()

      await page.getByRole('button', { name: /Envoyer ma demande/ }).click()
      await expect(page.locator('body')).toContainText('nous vous rappelons très vite')
    })

    test('a failed enquiry keeps the form and shows an error', async ({ page }) => {
      // Fail only the submission; the page itself still loads from fixtures.
      await page.route('**/api/coaching/inquiry', (r) =>
        r.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"Refus test"}' }),
      )
      await page.goto('/coaches')

      await page.getByPlaceholder('Votre nom').fill('Test Member')
      await page.getByPlaceholder('+216 XX XXX XXX').fill('+21622000000')
      await page.getByPlaceholder('vous@exemple.com').fill('test@example.test')
      await page.getByRole('button', { name: /Envoyer ma demande/ }).click()

      await expect(page.locator('body')).toContainText('Refus test')
      await expect(page.locator('body')).not.toContainText('nous vous rappelons')
      // Values are kept so nothing has to be retyped.
      await expect(page.getByPlaceholder('Votre nom')).toHaveValue('Test Member')
    })
  })
}
