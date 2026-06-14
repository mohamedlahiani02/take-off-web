import { test, expect } from '@playwright/test'

test.describe('Gateway page', () => {
  test('renders both sport sections', async ({ page }) => {
    await page.goto('/')

    // Both sport labels must be visible
    await expect(page.getByText('PADEL')).toBeVisible()
    await expect(page.getByText('PILATES')).toBeVisible()
  })

  test('clicking the padel CTA navigates to /padel', async ({ page }) => {
    await page.goto('/')

    await page.getByText(/enter the courts/i).click()

    await expect(page).toHaveURL('/padel')
  })

  test('clicking the pilates CTA navigates to /pilates', async ({ page }) => {
    await page.goto('/')

    await page.getByText(/enter the studio/i).click()

    await expect(page).toHaveURL('/pilates')
  })
})
