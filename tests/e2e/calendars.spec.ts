import { test, expect, devices } from '@playwright/test'
import type { Page, Route } from '@playwright/test'

/**
 * Booking-calendar regressions for /padel/reserve and /pilates/classes.
 *
 * Everything here is driven by real clicks and keystrokes. Calling the page's
 * own functions from the test would prove nothing about whether a member can
 * operate the page — that was exactly the failure mode these pages had, where
 * the logic worked but nothing was wired to it.
 *
 * All /api/v1/** traffic is served from fixtures, so no SMS is sent and no
 * booking or payment reaches a real backend.
 */

const COURT_ID = '20000000-0000-4000-8000-000000000001'
const CLUB_OFFSET_MS = 60 * 60 * 1000 // Africa/Tunis, UTC+1 year-round

interface ApiOptions {
  failCourts?: boolean
  failSlots?: boolean
  failSchedule?: boolean
  verifyOtpStatus?: number
  bookStatus?: number
  slotDelayMs?: (url: URL) => number
}

interface Recorded {
  requests: { method: string; url: string }[]
  pageErrors: string[]
}

/** Club-local calendar day of an instant, as YYYY-MM-DD. */
function clubDay(instant: number): string {
  return new Date(instant + CLUB_OFFSET_MS).toISOString().slice(0, 10)
}

/** UTC instant of midnight opening the given club day. */
function clubMidnight(day: string): number {
  return Date.parse(day + 'T00:00:00Z') - CLUB_OFFSET_MS
}

async function installApi(page: Page, opts: ApiOptions = {}): Promise<Recorded> {
  const rec: Recorded = { requests: [], pageErrors: [] }
  page.on('pageerror', (e) => rec.pageErrors.push(e.message))

  await page.route('**/api/v1/**', async (route: Route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    rec.requests.push({ method, url: url.pathname + url.search })

    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (url.pathname === '/api/v1/courts') {
      if (opts.failCourts) return json({ message: 'Synthetic outage' }, 503)
      return json([{ id: COURT_ID, name: 'Test Court', activity: 'PADEL', active: true }])
    }

    if (url.pathname.includes('/slots')) {
      if (opts.failSlots) return json({ message: 'Synthetic outage' }, 503)
      const date = url.searchParams.get('date')!
      // Ten 90-minute slots from 07:00 club time; the 08:30 one is taken.
      const base = clubMidnight(date) + 7 * 60 * 60 * 1000
      const slots = Array.from({ length: 10 }, (_, i) => {
        const start = base + i * 5400000
        return {
          startsAt: new Date(start).toISOString(),
          endsAt: new Date(start + 5400000).toISOString(),
          available: i !== 1,
          reason: i === 1 ? 'BOOKED' : null,
        }
      })
      if (opts.slotDelayMs) await new Promise((r) => setTimeout(r, opts.slotDelayMs!(url)))
      return json(slots)
    }

    if (url.pathname === '/api/v1/classes/schedule') {
      if (opts.failSchedule) return json({ message: 'Synthetic outage' }, 503)
      const from = Date.parse(url.searchParams.get('from')!)
      const to = Date.parse(url.searchParams.get('to')!)
      // One session on the first day and one on the seventh — the seventh is
      // the one an inclusive six-day upper bound used to drop.
      const sessions = [0, 6].map((d) => ({
        id: 'session-' + d,
        className: d === 6 ? 'Seventh day' : 'Pilates fixture',
        instructorName: 'Coach Fixture',
        startsAt: new Date(from + d * 86400000 + 9 * 3600000).toISOString(),
        durationMin: 60,
        maxSpots: 10,
        bookedSpots: 2,
        priceDt: 35,
      })).filter((s) => Date.parse(s.startsAt) >= from && Date.parse(s.startsAt) < to)
      return json(sessions)
    }

    if (url.pathname === '/api/v1/auth/send-otp') return json({ message: 'sent', isNewUser: false })
    if (url.pathname === '/api/v1/auth/verify-otp') {
      const status = opts.verifyOtpStatus ?? 200
      if (status !== 200) return json({ message: 'Invalid or expired code' }, status)
      return json({
        tokens: { accessToken: 'fixture-access', refreshToken: 'fixture-refresh' },
        user: { id: 'u1', name: 'Fixture Member', phone: '+21622000000' },
        claimed: false,
      })
    }
    if (url.pathname.includes('/bookings') || url.pathname.includes('/classes/bookings')) {
      const status = opts.bookStatus ?? 201
      if (status >= 400) return json({ message: 'Booking refused' }, status)
      return json({ bookingId: 'b1' }, 201)
    }
    return json([])
  })

  return rec
}

/** Header day numbers currently painted in the grid. */
async function dayNumbers(page: Page, kind: 'pr' | 'pc'): Promise<string[]> {
  const sel = kind === 'pr'
    ? '#pr-grid .pr-grid-header-cell div:nth-child(2)'
    : '#pc-grid .pc-grid-day-num'
  return page.locator(sel).allInnerTexts()
}

async function gotoCalendar(page: Page, kind: 'pr' | 'pc') {
  await page.goto(kind === 'pr' ? '/padel/reserve' : '/pilates/classes', { waitUntil: 'domcontentloaded' })
  // Wait for the runtime to mount and the first data paint to land.
  await expect(page.locator(`#${kind}-week-label`)).not.toHaveText(/Loading|Chargement/, { timeout: 30_000 })
  // Seven day numbers in the header is the signal that real data has painted.
  await expect.poll(async () => (await dayNumbers(page, kind)).length, { timeout: 30_000 }).toBe(7)
}

for (const [label, viewport] of [
  ['desktop', { width: 1440, height: 1000 }],
  ['mobile', devices['Pixel 5'].viewport!],
] as const) {
  test.describe(`${label} — padel reserve`, () => {
    test.use({ viewport, timezoneId: 'Africa/Tunis' })

    test('week controls move the week, repaint dates and refetch availability', async ({ page }) => {
      const rec = await installApi(page)
      await gotoCalendar(page, 'pr')

      const label0 = await page.locator('#pr-week-label').innerText()
      const days0 = await dayNumbers(page, 'pr')
      expect(days0).toHaveLength(7)

      // ── Next week ──────────────────────────────────────────────────────
      const before = rec.requests.length
      await page.getByRole('button', { name: 'Next week' }).click()
      await expect(page.locator('#pr-week-label')).not.toHaveText(label0)
      await expect
        .poll(() => rec.requests.slice(before).filter((r) => r.url.includes('/slots')).length)
        .toBe(7) // one GET per displayed day
      const label1 = await page.locator('#pr-week-label').innerText()
      await expect.poll(async () => (await dayNumbers(page, 'pr')).join(',')).not.toBe(days0.join(','))

      // ── Previous week returns exactly where we started ─────────────────
      const beforePrev = rec.requests.length
      await page.getByRole('button', { name: 'Previous week' }).click()
      await expect(page.locator('#pr-week-label')).toHaveText(label0)
      await expect
        .poll(() => rec.requests.slice(beforePrev).filter((r) => r.url.includes('/slots')).length)
        .toBe(7)
      await expect.poll(async () => (await dayNumbers(page, 'pr')).join(',')).toBe(days0.join(','))

      // ── Today, from a different week ───────────────────────────────────
      await page.getByRole('button', { name: 'Next week' }).click()
      await expect(page.locator('#pr-week-label')).toHaveText(label1)
      const beforeToday = rec.requests.length
      await page.getByRole('button', { name: 'Today' }).click()
      await expect(page.locator('#pr-week-label')).toHaveText(label0)
      await expect
        .poll(() => rec.requests.slice(beforeToday).filter((r) => r.url.includes('/slots')).length)
        .toBe(7)

      expect(rec.pageErrors).toEqual([])
    })

    test('the requested dates are the displayed club week, across month and year ends', async ({ page }) => {
      const rec = await installApi(page)
      await gotoCalendar(page, 'pr')

      // Walk far enough forward to cross a month boundary, and most likely a year.
      for (let i = 0; i < 20; i++) {
        const before = await page.locator('#pr-week-label').innerText()
        await page.getByRole('button', { name: 'Next week' }).click()
        await expect(page.locator('#pr-week-label')).not.toHaveText(before)
      }
      await expect.poll(() => rec.requests.filter((r) => r.url.includes('/slots')).length).toBeGreaterThan(0)

      const dates = rec.requests
        .filter((r) => r.url.includes('/slots'))
        .slice(-7)
        .map((r) => new URL(r.url, 'http://x').searchParams.get('date')!)
      expect(dates).toHaveLength(7)

      // Seven consecutive calendar days, correctly rolling over month/year.
      for (let i = 1; i < dates.length; i++) {
        const gap = clubMidnight(dates[i]!) - clubMidnight(dates[i - 1]!)
        expect(gap).toBe(86400000)
      }
      // And they are the days the header shows.
      const shown = await dayNumbers(page, 'pr')
      expect(shown).toEqual(dates.map((d) => String(Number(d.slice(8, 10)))))
    })

    test('rapid navigation never paints a superseded week', async ({ page }) => {
      // Make the first week's replies slow and later ones fast, so an
      // unguarded implementation would settle on the stale response.
      let call = 0
      const rec = await installApi(page, { slotDelayMs: () => (++call <= 7 ? 600 : 0) })
      await gotoCalendar(page, 'pr')

      await page.getByRole('button', { name: 'Next week' }).click()
      await page.getByRole('button', { name: 'Next week' }).click()
      await page.getByRole('button', { name: 'Next week' }).click()
      const settled = await page.locator('#pr-week-label').innerText()

      // Let every in-flight reply land, then confirm the view still matches
      // the last week the member asked for.
      await page.waitForTimeout(1500)
      await expect(page.locator('#pr-week-label')).toHaveText(settled)
      const dates = rec.requests
        .filter((r) => r.url.includes('/slots'))
        .slice(-7)
        .map((r) => new URL(r.url, 'http://x').searchParams.get('date')!)
      const shown = await dayNumbers(page, 'pr')
      expect(shown).toEqual(dates.map((d) => String(Number(d.slice(8, 10)))))
      expect(rec.pageErrors).toEqual([])
    })

    test('OTP modal closes by button, by Escape and by backdrop, and reopens clean', async ({ page }) => {
      await installApi(page)
      await gotoCalendar(page, 'pr')

      const overlay = page.locator('#pr-otp-overlay')
      const firstFree = page.locator('.pr-slot-free').first()

      // ── close button ───────────────────────────────────────────────────
      await firstFree.click()
      await expect(overlay).toBeVisible()
      await page.locator('#pr-otp-overlay .pr-otp-close').click()
      await expect(overlay).toBeHidden()

      // ── Escape ─────────────────────────────────────────────────────────
      await firstFree.click()
      await expect(overlay).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(overlay).toBeHidden()

      // ── backdrop click ─────────────────────────────────────────────────
      await firstFree.click()
      await expect(overlay).toBeVisible()
      await overlay.click({ position: { x: 5, y: 5 } })
      await expect(overlay).toBeHidden()

      // ── reopening a *different* slot starts from step 1 with no residue ─
      await page.locator('.pr-slot-free').nth(2).click()
      await expect(overlay).toBeVisible()
      await expect(page.locator('#pr-otp-step1')).toBeVisible()
      await expect(page.locator('#pr-otp-step2')).toBeHidden()
      await expect(page.locator('#pr-otp-err')).toBeHidden()
      // Focus is inside the dialog, not left behind on the grid.
      expect(await page.evaluate(() => !!document.activeElement?.closest('.pr-otp-panel'))).toBe(true)
    })

    test('a successful OTP resumes the chosen slot and can complete the booking', async ({ page }) => {
      const rec = await installApi(page)
      await gotoCalendar(page, 'pr')

      const target = page.locator('.pr-slot-free').first()
      const targetTime = (await target.innerText()).trim()
      await target.click()

      await page.locator('#pr-otp-phone').fill('+21622000000')
      await page.getByRole('button', { name: /Send code/ }).click()
      await expect(page.locator('#pr-otp-step2')).toBeVisible()
      await page.locator('#pr-otp-code').fill('123456')
      await page.getByRole('button', { name: /Verify/ }).click()

      // The slot the member picked before signing in is the one now offered.
      const mode = page.locator('#pr-mode-overlay')
      await expect(mode).toBeVisible()
      await expect(page.locator('#pr-mode-slot-info')).toContainText(targetTime)

      await page.getByRole('button', { name: /Share/ }).click()
      await expect.poll(() =>
        rec.requests.some((r) => r.method === 'POST' && r.url.includes('/bookings')),
      ).toBe(true)
      await expect(mode).toBeHidden()
    })

    test('a rejected OTP code shows an error and never opens the booking step', async ({ page }) => {
      await installApi(page, { verifyOtpStatus: 400 })
      await gotoCalendar(page, 'pr')

      await page.locator('.pr-slot-free').first().click()
      await page.locator('#pr-otp-phone').fill('+21622000000')
      await page.getByRole('button', { name: /Send code/ }).click()
      await expect(page.locator('#pr-otp-step2')).toBeVisible()
      await page.locator('#pr-otp-code').fill('000000')
      await page.getByRole('button', { name: /Verify/ }).click()

      await expect(page.locator('#pr-otp-err')).toBeVisible()
      await expect(page.locator('#pr-otp-overlay')).toBeVisible()
      await expect(page.locator('#pr-mode-overlay')).toBeHidden()
    })

    test('an availability outage shows no bookable slots', async ({ page }) => {
      await installApi(page, { failSlots: true })
      await page.goto('/padel/reserve', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('#pr-grid')).toContainText(/unavailable/i, { timeout: 30_000 })
      expect(await page.locator('.pr-slot-free').count()).toBe(0)
    })

    test('a courts outage shows no demo courts and no bookable slots', async ({ page }) => {
      await installApi(page, { failCourts: true })
      await page.goto('/padel/reserve', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('#pr-court-tabs')).toContainText(/unavailable/i, { timeout: 30_000 })
      expect(await page.locator('.pr-slot-free').count()).toBe(0)
      // The invented "Court 1"/"Court 2" placeholders must be gone.
      await expect(page.locator('#pr-court-tabs')).not.toContainText('Court 1')
    })
  })

  test.describe(`${label} — pilates classes`, () => {
    test.use({ viewport, timezoneId: 'Africa/Tunis' })

    test('week controls move the week, repaint dates and refetch the schedule', async ({ page }) => {
      const rec = await installApi(page)
      await gotoCalendar(page, 'pc')

      const label0 = await page.locator('#pc-week-label').innerText()
      const days0 = await dayNumbers(page, 'pc')
      expect(days0).toHaveLength(7)

      const before = rec.requests.length
      await page.getByRole('button', { name: 'Semaine suivante' }).click()
      await expect(page.locator('#pc-week-label')).not.toHaveText(label0)
      await expect
        .poll(() => rec.requests.slice(before).filter((r) => r.url.includes('/classes/schedule')).length)
        .toBeGreaterThan(0)
      const label1 = await page.locator('#pc-week-label').innerText()
      await expect.poll(async () => (await dayNumbers(page, 'pc')).join(',')).not.toBe(days0.join(','))

      await page.getByRole('button', { name: 'Semaine précédente' }).click()
      await expect(page.locator('#pc-week-label')).toHaveText(label0)
      await expect.poll(async () => (await dayNumbers(page, 'pc')).join(',')).toBe(days0.join(','))

      await page.getByRole('button', { name: 'Semaine suivante' }).click()
      await expect(page.locator('#pc-week-label')).toHaveText(label1)
      await page.getByRole('button', { name: "Aujourd'hui" }).click()
      await expect(page.locator('#pc-week-label')).toHaveText(label0)

      expect(rec.pageErrors).toEqual([])
    })

    test('the schedule query covers all seven displayed days', async ({ page }) => {
      const rec = await installApi(page)
      await gotoCalendar(page, 'pc')

      const last = rec.requests.filter((r) => r.url.includes('/classes/schedule')).at(-1)!
      const u = new URL(last.url, 'http://x')
      const from = Date.parse(u.searchParams.get('from')!)
      const to = Date.parse(u.searchParams.get('to')!)
      // Exclusive upper bound at the start of the eighth day: exactly 7 x 24h.
      expect((to - from) / 86400000).toBe(7)

      // The window starts at club midnight of the first displayed day.
      const shown = await dayNumbers(page, 'pc')
      expect(clubDay(from)).toBe(clubDay(from))
      expect(Number(clubDay(from).slice(8, 10))).toBe(Number(shown[0]))
      // And the last displayed day is inside the window.
      expect(Number(clubDay(to - 1).slice(8, 10))).toBe(Number(shown[6]))
    })

    test('a session on the seventh day is fetched and rendered', async ({ page }) => {
      await installApi(page)
      await gotoCalendar(page, 'pc')
      // The fixture puts "Seventh day" on the last displayed date; with the old
      // six-day bound it was never returned.
      await expect(page.locator('#pc-grid')).toContainText('Seventh day')
    })

    test('booking drawer closes by button, Escape and backdrop, and reopens clean', async ({ page }) => {
      await installApi(page)
      await gotoCalendar(page, 'pc')

      const overlay = page.locator('#pc-drawer-overlay')
      const card = page.locator('.pc-session-card').first()

      await card.click()
      await expect(overlay).toBeVisible()
      await page.locator('#pc-drawer-overlay .pc-drawer-close').click()
      await expect(overlay).toBeHidden()

      await card.click()
      await expect(overlay).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(overlay).toBeHidden()

      await card.click()
      await expect(overlay).toBeVisible()
      await overlay.click({ position: { x: 5, y: 5 } })
      await expect(overlay).toBeHidden()

      await card.click()
      await expect(overlay).toBeVisible()
      await expect(page.locator('#pc-otp-step1')).toBeVisible()
      await expect(page.locator('#pc-otp-step2')).toBeHidden()
      expect(await page.evaluate(() => !!document.activeElement?.closest('.pc-drawer'))).toBe(true)
    })

    test('a successful OTP keeps the chosen session and reveals booking', async ({ page }) => {
      const rec = await installApi(page)
      await gotoCalendar(page, 'pc')

      await page.locator('.pc-session-card').first().click()
      const title = await page.locator('#pc-drawer-title').innerText()

      await page.locator('#pc-otp-phone').fill('+21622000000')
      await page.getByRole('button', { name: /Envoyer le code/ }).click()
      await expect(page.locator('#pc-otp-step2')).toBeVisible()
      await page.locator('#pc-otp-code').fill('123456')
      await page.getByRole('button', { name: /Vérifier/ }).click()

      // Same session, now bookable.
      await expect(page.locator('#pc-book-section')).toBeVisible()
      await expect(page.locator('#pc-drawer-title')).toHaveText(title)
      await expect(page.locator('#pc-auth-gate')).toBeHidden()

      await page.getByRole('button', { name: /Réserver ma place/ }).click()
      await expect.poll(() =>
        rec.requests.some((r) => r.method === 'POST' && r.url.includes('/classes/bookings')),
      ).toBe(true)
    })

    test('a rejected OTP code never reveals the booking button', async ({ page }) => {
      await installApi(page, { verifyOtpStatus: 400 })
      await gotoCalendar(page, 'pc')

      await page.locator('.pc-session-card').first().click()
      await page.locator('#pc-otp-phone').fill('+21622000000')
      await page.getByRole('button', { name: /Envoyer le code/ }).click()
      await expect(page.locator('#pc-otp-step2')).toBeVisible()
      await page.locator('#pc-otp-code').fill('000000')
      await page.getByRole('button', { name: /Vérifier/ }).click()

      await expect(page.locator('#pc-otp-err2')).toBeVisible()
      await expect(page.locator('#pc-book-section')).toBeHidden()
    })

    test('class-type filters react to real clicks', async ({ page }) => {
      await installApi(page)
      await gotoCalendar(page, 'pc')

      // Fixture publishes two distinct class names, so a real filter appears.
      const filter = page.locator('.pc-filter-btn[data-filter="Seventh day"]')
      await expect(filter).toBeVisible()
      await filter.click()
      await expect(filter).toHaveClass(/active/)
      await expect(page.locator('#pc-grid')).not.toContainText('Pilates fixture')
      await expect(page.locator('#pc-grid')).toContainText('Seventh day')

      await page.locator('.pc-filter-btn[data-filter="ALL"]').click()
      await expect(page.locator('#pc-grid')).toContainText('Pilates fixture')
    })

    test('a schedule outage is reported, not shown as an empty week', async ({ page }) => {
      await installApi(page, { failSchedule: true })
      await page.goto('/pilates/classes', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('#pc-grid')).toContainText(/indisponible/i, { timeout: 30_000 })
      expect(await page.locator('.pc-session-card').count()).toBe(0)
      // "No sessions this week" would be a lie during an outage.
      await expect(page.locator('#pc-grid')).not.toContainText('Aucune séance')
    })
  })
}
