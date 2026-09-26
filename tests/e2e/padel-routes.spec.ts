import { test, expect } from '@playwright/test'
import { IDS } from '../fixtures/api-server.cjs'

/**
 * The padel sub-routes that used to return the general padel page.
 *
 * /padel/booking, /padel/ladder, /padel/tournaments and /pilates/schedule all
 * ignored their own path and rendered the same prototype file, so four menu
 * entries led nowhere in particular. Tournaments now has a real page; the rest
 * go where their function actually lives.
 */

test.describe('padel sub-routes', () => {
  test.use({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Africa/Tunis' })

  test('"Book a court" reaches the court calendar', async ({ page }) => {
    await page.goto('/padel/booking')
    await expect(page).toHaveURL(/\/padel\/reserve$/)
    // Not just the URL: the calendar itself must be there.
    await expect(page.locator('#pr-week-label')).toBeVisible()
  })

  test('the ladder goes to the padel page rather than inventing standings', async ({ page }) => {
    await page.goto('/padel/ladder')
    await expect(page).toHaveURL(/\/padel$/)
  })

  test('"Schedule" reaches the class calendar, keeping its filter', async ({ page }) => {
    await page.goto('/pilates/schedule?type=reformer')
    await expect(page).toHaveURL(/\/pilates\/classes\?type=reformer$/)
  })

  test('the tournaments list renders the club’s own tournaments', async ({ page }) => {
    await page.goto('/padel/tournaments')

    // Its own page, not the padel page.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const card = page.getByRole('link', { name: /Coupe de Test/ })
    await expect(card).toBeVisible()
    await expect(card).toContainText('1000 DT')
    await expect(card).toContainText('5 / 16 inscrits')

    // And it links to the detail page, which the list used to lack entirely.
    await expect(card).toHaveAttribute('href', new RegExp(IDS.tournament))
    await card.click()
    await page.waitForURL(new RegExp(IDS.tournament))
    await expect(page.getByRole('heading', { name: /Coupe de Test/ })).toBeVisible()
  })

  test('the tournaments page carries its own metadata', async ({ page }) => {
    await page.goto('/padel/tournaments')
    // Every one of these routes previously had no title of its own.
    await expect(page).toHaveTitle(/Take Off Club/)
    const desc = page.locator('meta[name="description"]')
    await expect(desc).toHaveAttribute('content', /.+/)
  })
})
