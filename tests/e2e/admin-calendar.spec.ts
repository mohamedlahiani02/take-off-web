import { test, expect } from '@playwright/test'
import type { Page, Route } from '@playwright/test'

/**
 * The admin calendar, in the club's timezone and in another one.
 *
 * The console placed bookings with the browser's getHours(), so a booking at
 * 2026-09-25T06:00:00Z sat on the 07:00 row in Tunis and on an 08:00 row in
 * Paris — a row CAL_SLOTS does not contain, so it disappeared entirely. The
 * same database row was visible to some staff and invisible to others.
 *
 * These cases assert the booking lands on the same club row in both zones.
 */

const COURT_ID = '20000000-0000-4000-8000-000000000001'
/** 07:00 Africa/Tunis — the row the defect ate for anyone further east. */
const BOOKING_ISO = '2026-09-25T06:00:00Z'
const CLUB_DAY = '2026-09-25'

async function installAdminApi(page: Page) {
  // The console keeps its JWT in sessionStorage; seed it before any script runs.
  await page.addInitScript(() => {
    sessionStorage.setItem('takeoff_admin_token', 'fixture-admin-token')
  })

  await page.route('**/api/v1/**', async (route: Route) => {
    const url = new URL(route.request().url())
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (url.pathname === '/api/v1/admin/courts/calendar') {
      return json({
        courts: [{ id: COURT_ID, name: 'Court 1', activity: 'PADEL', active: true }],
        bookings: [
          {
            id: 'bk-tz',
            courtId: COURT_ID,
            userId: 'u1',
            userName: 'Tz Fixture',
            startsAt: BOOKING_ISO,
            endsAt: new Date(Date.parse(BOOKING_ISO) + 5400000).toISOString(),
            mode: 'FULL',
            status: 'CONFIRMED',
            priceDt: 80,
            paymentStatus: 'PAY_AT_CLUB',
            paymentState: 'UNPAID',
            players: [],
          },
        ],
        blocks: [],
      })
    }
    if (url.pathname === '/api/v1/admin/dashboard') return json({})
    return json([])
  })
}

for (const tz of ['Africa/Tunis', 'Europe/Paris'] as const) {
  test.describe(`${tz} — admin calendar`, () => {
    test.use({ viewport: { width: 1440, height: 1000 }, timezoneId: tz })

    test('a booking appears on its club row, whatever the browser clock', async ({ page }) => {
      await installAdminApi(page)
      await page.goto(`/admin/index.html#courts`)

      // Wait for the console to boot and fetch its configuration.
      await page.waitForFunction(() => !!(window as unknown as { ClubTime?: unknown }).ClubTime)

      // The helper must resolve club time regardless of the browser's zone.
      const seen = await page.evaluate((iso) => {
        const CT = (window as unknown as {
          ClubTime: { timeKey: (s: string) => string; dayKey: (s: string) => string }
        }).ClubTime
        return { time: CT.timeKey(iso), day: CT.dayKey(iso) }
      }, BOOKING_ISO)

      expect(seen.time).toBe('07:00')
      expect(seen.day).toBe(CLUB_DAY)
    })

    test('a club wall-clock time round-trips to the same instant', async ({ page }) => {
      await installAdminApi(page)
      await page.goto('/admin/index.html')
      await page.waitForFunction(() => !!(window as unknown as { ClubTime?: unknown }).ClubTime)

      const result = await page.evaluate(() => {
        const CT = (window as unknown as {
          ClubTime: {
            instantOf: (d: string, t: string) => Date
            timeKey: (s: string) => string
            dayKey: (s: string) => string
            shiftDay: (d: string, n: number) => string
            weekWindow: (d: string) => { from: string; to: string }
          }
        }).ClubTime
        const inst = CT.instantOf('2026-09-25', '07:00').toISOString()
        const w = CT.weekWindow('2026-09-21')
        return {
          inst,
          back: CT.timeKey(inst),
          day: CT.dayKey(inst),
          monthRollover: CT.shiftDay('2026-09-30', 1),
          yearRollover: CT.shiftDay('2026-12-31', 1),
          weekDays: (Date.parse(w.to) - Date.parse(w.from)) / 86400000,
        }
      })

      // Staff type a club time; that is the instant the club will run.
      // Compare instants, not their string spelling (millis are optional).
      expect(Date.parse(result.inst)).toBe(Date.parse(BOOKING_ISO))
      expect(result.back).toBe('07:00')
      expect(result.day).toBe(CLUB_DAY)
      expect(result.monthRollover).toBe('2026-10-01')
      expect(result.yearRollover).toBe('2027-01-01')
      // Seven whole club days, so the last one is not clipped.
      expect(result.weekDays).toBe(7)
    })

    test('the console takes its API address from configuration', async ({ page }) => {
      await installAdminApi(page)
      await page.goto('/admin/index.html')
      await page.waitForFunction(
        () => typeof (window as unknown as { TAKEOFF_API_URL?: string }).TAKEOFF_API_URL === 'string',
      )

      const configured = await page.evaluate(async () => {
        await (window as unknown as { TAKEOFF_API_READY: Promise<void> }).TAKEOFF_API_READY
        return (window as unknown as { TAKEOFF_API_URL: string }).TAKEOFF_API_URL
      })

      // Whatever this deployment is pointed at — never a hard-coded production URL.
      const expected = await (await page.request.get('/api/config')).json()
      expect(configured).toBe(expected.apiUrl)
    })
  })
}
