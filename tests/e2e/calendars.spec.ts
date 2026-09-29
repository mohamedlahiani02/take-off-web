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
  /** Marks one padel slot as a joinable shared match (SHARE_OPEN). */
  shareOpen?: boolean
  /** Decorates fixture sessions with status / own-booking / waitlist state. */
  sessionState?: 'cancelled' | 'booked' | 'waitlisted' | 'full-with-waitlist'
  /** Treat the visitor as signed out, so the journey asks for a code. */
  signedOut?: boolean
}

interface Recorded {
  requests: { method: string; url: string; body?: string }[]
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

/** Builds the class-schedule fixture rows, decorated per `opts.sessionState`. */
function classSessionsFixture(from: number, to: number, opts: ApiOptions) {
  return [0, 6]
    .map((d) => ({
      id: 'session-' + d,
      classTypeId: 'ct-' + d,
      className: d === 6 ? 'Seventh day' : 'Pilates fixture',
      level: null as string | null,
      instructorName: 'Coach Fixture',
      startsAt: new Date(from + d * 86400000 + 9 * 3600000).toISOString(),
      durationMin: 60,
      maxSpots: 10,
      bookedSpots: 2,
      waitlistCount: 0,
      priceDt: 35,
      status: 'SCHEDULED',
      myBookingId: null as string | null,
      myStatus: null as string | null,
    }))
    .filter((s) => Date.parse(s.startsAt) >= from && Date.parse(s.startsAt) < to)
    .map((s) => {
      switch (opts.sessionState) {
        case 'cancelled':
          return { ...s, status: 'CANCELLED' }
        case 'booked':
          return { ...s, myBookingId: 'bk-1', myStatus: 'BOOKED' }
        case 'waitlisted':
          return { ...s, myBookingId: 'bk-2', myStatus: 'WAITLIST' }
        case 'full-with-waitlist':
          return { ...s, bookedSpots: 10, waitlistCount: 3 }
        default:
          return s
      }
    })
}

async function installApi(page: Page, opts: ApiOptions = {}): Promise<Recorded> {
  const rec: Recorded = { requests: [], pageErrors: [] }
  page.on('pageerror', (e) => rec.pageErrors.push(e.message))

  await page.route('**/api/**', async (route: Route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    rec.requests.push({
      method,
      url: url.pathname + url.search,
      body: method === 'POST' ? (route.request().postData() ?? undefined) : undefined,
    })

    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    // ── Next proxy routes (cookie session) ────────────────────────────────
    if (url.pathname === '/api/courts/pricing' || url.pathname === '/api/v1/courts/pricing') {
      return json({ fullPriceDt: 80, seatPriceDt: 20, seatsPerCourt: 4, currency: 'TND', slotMinutes: 90 })
    }
    if (url.pathname === '/api/auth/send-otp') {
      // Existing member: straight to the code step.
      return json({ message: 'sent', isNewUser: false })
    }
    if (url.pathname === '/api/auth/login') {
      if (opts.verifyOtpStatus && opts.verifyOtpStatus !== 200) {
        return json({ detail: 'Invalid or expired code' }, opts.verifyOtpStatus)
      }
      return json({ user: { id: 'u1', name: 'Fixture Member', phone: '+21622000000' } })
    }
    if (url.pathname === '/api/me') {
      if (opts.signedOut) return json({ error: 'Not authenticated' }, 401)
      return json({ id: 'u1', name: 'Fixture Member', phone: '+21622000000' })
    }
    if (/^\/api\/courts\/[^/]+\/bookings$/.test(url.pathname)) {
      const status = opts.bookStatus ?? 201
      if (status >= 400) return json({ detail: 'Booking refused' }, status)
      return json({ bookingId: 'b1' }, 201)
    }
    if (url.pathname === '/api/classes/bookings' && method === 'POST') {
      const status = opts.bookStatus ?? 201
      if (status >= 400) return json({ detail: 'Booking refused' }, status)
      let body: Record<string, unknown> = {}
      try {
        body = JSON.parse(route.request().postData() ?? '{}')
      } catch {
        body = {}
      }
      // The fixture session is only ever full when the caller deliberately
      // asked for the full-with-waitlist state — mirror that into the
      // response so a join-the-waitlist journey never looks like a paid booking.
      const isWaitlist = opts.sessionState === 'full-with-waitlist'
      return json(
        {
          bookingId: 'b1',
          status: isWaitlist ? 'WAITLIST' : 'BOOKED',
          paidWith: isWaitlist ? 'WAITLIST' : body['paymentMethod'] === 'WALLET' ? 'WALLET' : 'PACK',
          priceDt: isWaitlist ? 0 : 35,
        },
        201,
      )
    }
    if (/^\/api\/classes\/bookings\/[^/]+$/.test(url.pathname) && method === 'DELETE') {
      return json({}, 200)
    }
    if (url.pathname === '/api/classes/packs/mine') {
      return json([])
    }
    if (url.pathname === '/api/classes/schedule') {
      if (opts.failSchedule) return json({ message: 'Synthetic outage' }, 503)
      const from = Date.parse(url.searchParams.get('from')!)
      const to = Date.parse(url.searchParams.get('to')!)
      return json(classSessionsFixture(from, to, opts))
    }
    // Anything else under /api/ that is not the versioned API is not ours.
    if (!url.pathname.startsWith('/api/v1/')) return route.continue()

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
        // i=1 taken; i=2 is a joinable shared match when requested.
        const shared = opts.shareOpen && i === 2
        return {
          startsAt: new Date(start).toISOString(),
          endsAt: new Date(start + 5400000).toISOString(),
          available: i !== 1,
          reason: i === 1 ? 'BOOKED' : shared ? 'SHARE_OPEN' : null,
          openShareSlots: shared ? 2 : 0,
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
      return json(classSessionsFixture(from, to, opts))
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
async function dayNumbers(page: Page, kind: 'pr' | 'pl'): Promise<string[]> {
  const sel = kind === 'pr'
    ? '#pr-grid .pr-grid-header-cell div:nth-child(2)'
    : '#pl-grid .pl-grid-day-num'
  return page.locator(sel).allInnerTexts()
}

/**
 * Pages still served by the prototype fetch React from a CDN and are slow to
 * boot on a cold runner; migrated TSX pages bundle it and are fast. One
 * generous budget covers both while the migration is in progress.
 */
const BOOT_TIMEOUT = process.env['CI'] ? 60_000 : 30_000

async function gotoCalendar(page: Page, kind: 'pr' | 'pl') {
  // The pilates grid is server-rendered, so its header is visible before React
  // has hydrated and a click on it would be silently dropped. Its first
  // schedule fetch only fires from a post-hydration effect, so waiting for that
  // response is the signal that the controls are live.
  const hydrated =
    kind === 'pl' ? page.waitForResponse((r) => r.url().includes('/classes/schedule'), { timeout: BOOT_TIMEOUT }) : null
  await page.goto(kind === 'pr' ? '/padel/reserve' : '/pilates/classes', { waitUntil: 'domcontentloaded' })
  // Wait for the runtime to mount and the first data paint to land.
  await expect(page.locator(`#${kind}-week-label`)).not.toHaveText(/Loading|Chargement/, {
    timeout: BOOT_TIMEOUT,
  })
  await hydrated
  // Seven day numbers in the header is the signal that real data has painted.
  await expect.poll(async () => (await dayNumbers(page, kind)).length, { timeout: BOOT_TIMEOUT }).toBe(7)
}

/**
 * Both viewports in two timezones. Africa/Tunis is the club's own; Europe/Paris
 * is an hour ahead in summer, which is where a grid keyed on the browser's
 * clock puts a booking on a row that does not exist — and so shows nothing.
 */
for (const [label, viewport] of [
  ['desktop', { width: 1440, height: 1000 }],
  ['mobile', devices['Pixel 5'].viewport!],
] as const)
for (const tz of ['Africa/Tunis', 'Europe/Paris'] as const) {
  test.describe(`${label}/${tz} — padel reserve`, () => {
    test.use({ viewport, timezoneId: tz })

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

    test('clicking a slot books nothing until the journey is confirmed', async ({ page }) => {
      const rec = await installApi(page)
      await gotoCalendar(page, 'pr')

      await page.locator('.pr-slot-free').first().click()
      await expect(page.locator('#pr-booking-overlay')).toBeVisible()

      const bookings = () =>
        rec.requests.filter((r) => r.method === 'POST' && r.url.includes('/bookings'))

      // The single most important guarantee: opening the journey is not a booking.
      await page.waitForTimeout(500)
      expect(bookings()).toEqual([])

      // Walking forward through every step still books nothing.
      await page.locator('#pr-booking-next').click()
      await page.locator('#pr-booking-next').click()
      await expect(page.locator('#pr-booking-confirm')).toBeVisible()
      expect(bookings()).toEqual([])

      // Abandoning mid-journey leaves nothing behind either.
      await page.keyboard.press('Escape')
      await expect(page.locator('#pr-booking-overlay')).toBeHidden()
      expect(bookings()).toEqual([])
    })

    test('the journey closes by button, Escape and backdrop, and reopens clean', async ({ page }) => {
      await installApi(page)
      await gotoCalendar(page, 'pr')

      const overlay = page.locator('#pr-booking-overlay')
      const slot = page.locator('.pr-slot-free').first()

      await slot.click()
      await expect(overlay).toBeVisible()
      await page.locator('#pr-booking-overlay button[aria-label="Close"]').click()
      await expect(overlay).toBeHidden()

      await slot.click()
      await page.keyboard.press('Escape')
      await expect(overlay).toBeHidden()

      await slot.click()
      // The id sits on the panel; the backdrop is its parent.
      await overlay.locator('xpath=..').click({ position: { x: 5, y: 5 } })
      await expect(overlay).toBeHidden()

      // A different slot restarts at step one with no residue.
      await page.locator('.pr-slot-free').nth(2).click()
      await expect(page.locator('#pr-booking-heading')).toHaveText(/How do you want to book/)
      expect(await page.evaluate(() => !!document.activeElement?.closest('#pr-booking-overlay'))).toBe(true)
    })

    test('the summary quotes the server price and confirming books once', async ({ page }) => {
      const rec = await installApi(page)
      await gotoCalendar(page, 'pr')

      await page.locator('.pr-slot-free').first().click()
      // Whole court, so the price shown must be the 80 DT the server published.
      await page.locator('#pr-mode-full').click()
      await page.locator('#pr-booking-next').click()
      await page.locator('#pr-booking-next').click()

      await expect(page.locator('#pr-booking-total')).toHaveText('80.000 DT')
      await page.locator('#pr-booking-confirm').click()

      await expect(page.locator('#pr-booking-done')).toBeVisible()
      const posts = rec.requests.filter((r) => r.method === 'POST' && r.url.includes('/bookings'))
      expect(posts).toHaveLength(1)
    })

    test('optional partners can be named, and booking alone still works', async ({ page }) => {
      await installApi(page)
      await gotoCalendar(page, 'pr')

      await page.locator('.pr-slot-free').first().click()
      await page.locator('#pr-booking-next').click()

      // Naming is explicitly optional: the step can be walked straight past.
      await expect(page.locator('#pr-booking-heading')).toHaveText(/optional/i)
      await page.getByRole('button', { name: '+ Guest by name' }).click()
      await page.getByLabel('Partner 1 name').fill('Invite Test')
      await page.locator('#pr-booking-next').click()

      await expect(page.locator('#pr-booking-confirm')).toBeVisible()
      await expect(page.locator('#pr-booking-overlay')).toContainText('Players named')
    })

    test('a failed booking reports the error and never shows success', async ({ page }) => {
      await installApi(page, { bookStatus: 409 })
      await gotoCalendar(page, 'pr')

      await page.locator('.pr-slot-free').first().click()
      await page.locator('#pr-booking-next').click()
      await page.locator('#pr-booking-next').click()
      await page.locator('#pr-booking-confirm').click()

      await expect(page.locator('#pr-booking-error')).toBeVisible()
      await expect(page.locator('#pr-booking-done')).toHaveCount(0)
    })

    test('a rejected OTP code never reaches the summary', async ({ page }) => {
      await installApi(page, { verifyOtpStatus: 400, signedOut: true })
      await gotoCalendar(page, 'pr')

      await page.locator('.pr-slot-free').first().click()
      await page.locator('#pr-booking-next').click()
      await page.locator('#pr-booking-next').click()

      await page.locator('#pr-otp-phone').fill('+21622000000')
      await page.getByRole('button', { name: /Send code/ }).click()
      await page.locator('#pr-otp-code').fill('000000')
      await page.getByRole('button', { name: /Verify/ }).click()

      await expect(page.locator('#pr-otp-err')).toBeVisible()
      await expect(page.locator('#pr-booking-confirm')).toHaveCount(0)
    })

    test('a joinable shared match is distinguished from a free court', async ({ page }) => {
      await installApi(page, { shareOpen: true })
      await gotoCalendar(page, 'pr')

      const share = page.locator('.pr-slot-share-open').first()
      await expect(share).toBeVisible()
      // It advertises the remaining tranches rather than looking like an empty court.
      await expect(share).toContainText('JOIN')
      await expect(share).toHaveAttribute('title', /2 place/)

      // Opening it offers joining the share, not taking the whole court.
      await share.click()
      await expect(page.locator('#pr-booking-heading')).toHaveText('Join this match')
      await expect(page.locator('#pr-mode-full')).toHaveCount(0)
      await expect(page.locator('#pr-mode-share')).toBeVisible()
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

  test.describe(`${label}/${tz} — pilates classes`, () => {
    test.use({ viewport, timezoneId: tz })

    // NOTE: this redesign (a real 7-day x hourly week grid, see
    // components/pilates/class-calendar.tsx) has no class-type filter control —
    // the whole week is shown at a glance instead of a filterable list. The old
    // `.pc-filter-btn` coverage from the previous list UI has no equivalent to
    // test here; it was not reintroduced as it would require adding a feature
    // the approved redesign deliberately doesn't have.

    test('week controls move the week, repaint dates and refetch the schedule', async ({ page }) => {
      const rec = await installApi(page)
      await gotoCalendar(page, 'pl')

      const label0 = await page.locator('#pl-week-label').innerText()
      const days0 = await dayNumbers(page, 'pl')
      expect(days0).toHaveLength(7)

      const before = rec.requests.length
      await page.getByRole('button', { name: 'Next week' }).click()
      await expect(page.locator('#pl-week-label')).not.toHaveText(label0)
      await expect
        .poll(() => rec.requests.slice(before).filter((r) => r.url.includes('/classes/schedule')).length)
        .toBeGreaterThan(0)
      const label1 = await page.locator('#pl-week-label').innerText()
      await expect.poll(async () => (await dayNumbers(page, 'pl')).join(',')).not.toBe(days0.join(','))

      await page.getByRole('button', { name: 'Previous week' }).click()
      await expect(page.locator('#pl-week-label')).toHaveText(label0)
      await expect.poll(async () => (await dayNumbers(page, 'pl')).join(',')).toBe(days0.join(','))

      await page.getByRole('button', { name: 'Next week' }).click()
      await expect(page.locator('#pl-week-label')).toHaveText(label1)
      await page.getByRole('button', { name: 'Today' }).click()
      await expect(page.locator('#pl-week-label')).toHaveText(label0)

      expect(rec.pageErrors).toEqual([])
    })

    test('the schedule query covers all seven displayed days', async ({ page }) => {
      const rec = await installApi(page)
      await gotoCalendar(page, 'pl')

      const last = rec.requests.filter((r) => r.url.includes('/classes/schedule')).at(-1)!
      const u = new URL(last.url, 'http://x')
      const from = Date.parse(u.searchParams.get('from')!)
      const to = Date.parse(u.searchParams.get('to')!)
      // Exclusive upper bound at the start of the eighth day: exactly 7 x 24h.
      expect((to - from) / 86400000).toBe(7)

      // The window starts at club midnight of the first displayed day.
      const shown = await dayNumbers(page, 'pl')
      expect(clubDay(from)).toBe(clubDay(from))
      expect(Number(clubDay(from).slice(8, 10))).toBe(Number(shown[0]))
      // And the last displayed day is inside the window.
      expect(Number(clubDay(to - 1).slice(8, 10))).toBe(Number(shown[6]))
    })

    test('a session on the seventh day is fetched and rendered', async ({ page }) => {
      await installApi(page)
      await gotoCalendar(page, 'pl')
      // The fixture puts "Seventh day" on the last displayed date; with the old
      // six-day bound it was never returned.
      await expect(page.locator('#pl-grid')).toContainText('Seventh day')
    })

    test('the booking overlay closes by cancel button and backdrop, and reopens clean without booking anything', async ({
      page,
    }) => {
      const rec = await installApi(page)
      await gotoCalendar(page, 'pl')

      const bookings = () => rec.requests.filter((r) => r.method === 'POST' && r.url.includes('/classes/bookings'))
      const overlay = page.locator('#pl-booking-overlay')
      const card = page.locator('.pl-session-card').first()

      await card.click()
      await expect(overlay).toBeVisible()
      await expect(page.locator('#pl-recap')).toBeVisible()
      await page.waitForTimeout(300)
      expect(bookings()).toEqual([])

      await page.locator('#pl-cancel').click()
      await expect(overlay).toBeHidden()
      expect(bookings()).toEqual([])

      await card.click()
      await expect(overlay).toBeVisible()
      // The id sits on the panel; the backdrop is its parent.
      await overlay.locator('xpath=..').click({ position: { x: 5, y: 5 } })
      await expect(overlay).toBeHidden()
      expect(bookings()).toEqual([])

      // A fresh open still starts clean, at the recap step.
      await card.click()
      await expect(page.locator('#pl-recap')).toBeVisible()
    })

    test('a booking never shows success without a real POST, and confirms with the wallet payment method', async ({
      page,
    }) => {
      const rec = await installApi(page)
      await gotoCalendar(page, 'pl')

      await page.locator('.pl-session-card').first().click()
      await expect(page.locator('#pl-recap')).toBeVisible()

      const bookings = () => rec.requests.filter((r) => r.method === 'POST' && r.url.includes('/classes/bookings'))
      expect(bookings()).toEqual([])

      await page.locator('#pl-confirm').click()
      await expect(page.locator('#pl-done')).toBeVisible()

      expect(bookings()).toHaveLength(1)
      const body = JSON.parse(bookings()[0]!.body ?? '{}')
      expect(body.paymentMethod).toBe('WALLET')
      await expect(page.locator('#pl-done-status')).toHaveAttribute('data-status', 'BOOKED')
      await expect(page.locator('#pl-done')).toContainText('CONFIRMÉE')
    })

    test('a failed booking reports the error and never shows success', async ({ page }) => {
      const rec = await installApi(page, { bookStatus: 409 })
      await gotoCalendar(page, 'pl')

      await page.locator('.pl-session-card').first().click()
      await page.locator('#pl-confirm').click()

      await expect(page.locator('#pl-error')).toBeVisible()
      await expect(page.locator('#pl-done')).toHaveCount(0)
      expect(rec.requests.filter((r) => r.method === 'POST' && r.url.includes('/classes/bookings'))).toHaveLength(1)
    })

    test('a rejected OTP code never reveals a bookable or booked state', async ({ page }) => {
      const rec = await installApi(page, { verifyOtpStatus: 400, signedOut: true })
      await gotoCalendar(page, 'pl')

      await page.locator('.pl-session-card').first().click()
      // Signed out, so confirming asks for identity first — nothing is booked yet.
      await page.locator('#pl-confirm').click()

      await page.locator('#auth-phone-input').fill('+21622000000')
      await page.locator('#auth-send-code').click()
      await page.locator('#auth-code-input').fill('000000')
      await page.locator('#auth-verify').click()

      await expect(page.locator('#auth-error')).toBeVisible()
      await expect(page.locator('#pl-done')).toHaveCount(0)
      // Still on the sign-in step — the recap/confirm screen was never handed back.
      await expect(page.locator('#pl-confirm')).toHaveCount(0)
      expect(rec.requests.filter((r) => r.method === 'POST' && r.url.includes('/classes/bookings'))).toEqual([])
    })

    test('a cancelled session is not offered as bookable', async ({ page }) => {
      await installApi(page, { sessionState: 'cancelled' })
      await gotoCalendar(page, 'pl')

      const card = page.locator('.pl-session-card').first()
      await expect(card).toHaveClass(/pl-session-cancelled/)
      await expect(card).toHaveAttribute('data-state', 'CANCELLED')
      await expect(card).toContainText('Annulé')
      await expect(card).toBeDisabled()

      // A disabled button ignores clicks; the overlay never opens.
      await card.click({ force: true }).catch(() => {})
      await expect(page.locator('#pl-booking-overlay')).toHaveCount(0)
    })

    test('an existing booking is shown as such, not offered again', async ({ page }) => {
      await installApi(page, { sessionState: 'booked' })
      await gotoCalendar(page, 'pl')

      const card = page.locator('.pl-session-card').first()
      await expect(card).toHaveClass(/pl-session-mine/)
      await expect(card).toHaveAttribute('data-state', 'BOOKED')
      await expect(card).toContainText('Réservé')

      // Clicking the already-booked card does not offer a second booking.
      await card.click()
      await expect(page.locator('#pl-booking-overlay')).toHaveCount(0)
    })

    test('a waitlisted booking is visually and semantically distinct from a confirmed booking', async ({ page }) => {
      await installApi(page, { sessionState: 'waitlisted' })
      await gotoCalendar(page, 'pl')

      const card = page.locator('.pl-session-card').first()
      await expect(card).toHaveClass(/pl-session-waitlist/)
      await expect(card).toHaveAttribute('data-state', 'WAITLIST')
      await expect(card).toContainText('Liste d’attente')
      // Never shows "reserved"/"booked" wording for a waitlist state.
      await expect(card).not.toContainText('Réservé')

      // Clicking a waitlisted card does not reopen a booking offer either.
      await card.click()
      await expect(page.locator('#pl-booking-overlay')).toHaveCount(0)
    })

    test('a full session surfaces its waitlist length, and joining it charges and reserves nothing', async ({
      page,
    }) => {
      const rec = await installApi(page, { sessionState: 'full-with-waitlist' })
      await gotoCalendar(page, 'pl')

      const card = page.locator('.pl-session-card').first()
      await expect(card).toHaveClass(/pl-session-full/)
      await expect(card).toHaveAttribute('data-state', 'FULL')
      await expect(card).toContainText('Complet')
      await expect(card).toContainText('3 en attente')

      await card.click()
      await expect(page.locator('#pl-full-notice')).toContainText('liste d’attente')
      await expect(page.locator('#pl-confirm')).toHaveText(/liste d’attente/)

      await page.locator('#pl-confirm').click()
      await expect(page.locator('#pl-done')).toBeVisible()

      const posts = rec.requests.filter((r) => r.method === 'POST' && r.url.includes('/classes/bookings'))
      expect(posts).toHaveLength(1)
      await expect(page.locator('#pl-done-status')).toHaveAttribute('data-status', 'WAITLIST')
      // Nothing was debited for a waitlist join.
      await expect(page.locator('#pl-done')).toContainText('Rien ne vous a été débité');
    })

    test('a schedule-fetch outage is reported as unavailable, never silently shown as no sessions', async ({
      page,
    }) => {
      await installApi(page, { failSchedule: true })
      await page.goto('/pilates/classes', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('#pl-outage')).toContainText(/indisponible/i, { timeout: 30_000 })
      expect(await page.locator('.pl-session-card').count()).toBe(0)
      await expect(page.locator('#pl-grid')).toHaveCount(0)
    })
  })
}
