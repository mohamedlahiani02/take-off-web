/**
 * Calendar arithmetic in the club's own timezone.
 *
 * Africa/Tunis is UTC+1 all year (no DST). Days shown are *club* days, so a
 * member browsing from another timezone still sees the club's week rather than
 * their own — the prototype computed days in the browser's zone, which shifted
 * the grid for anyone outside Tunisia.
 *
 * Dates are handled as `YYYY-MM-DD` club-day keys rather than Date objects, so
 * month and year rollovers are arithmetic on real calendar days instead of
 * millisecond offsets.
 */

export const CLUB_OFFSET_MIN = 60
export const SLOT_MINUTES = 90
/** Opening and closing wall-clock hours at the club. */
export const OPEN_HOUR = 7
export const CLOSE_HOUR = 22

export const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
export const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] as const
export const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'] as const

const pad = (n: number) => String(n).padStart(2, '0')

interface ClubParts {
  y: number
  m: number // 0-indexed
  d: number
  dow: number
  hour: number
  minute: number
}

/** The club-local calendar parts of an instant. */
export function clubParts(instant: Date): ClubParts {
  const t = new Date(instant.getTime() + CLUB_OFFSET_MIN * 60_000)
  return {
    y: t.getUTCFullYear(),
    m: t.getUTCMonth(),
    d: t.getUTCDate(),
    dow: t.getUTCDay(),
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
  }
}

/** The UTC instant of midnight opening a club day. Normalises out-of-range values. */
export function clubMidnight(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d, 0, 0, 0) - CLUB_OFFSET_MIN * 60_000)
}

export function dayKey(y: number, m: number, d: number): string {
  const p = clubParts(clubMidnight(y, m, d))
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`
}

export function parseKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number)
  return { y: y!, m: m! - 1, d: d! }
}

/** Shifts a club day by whole days, rolling over months and years correctly. */
export function shiftKey(key: string, delta: number): string {
  const p = parseKey(key)
  return dayKey(p.y, p.m, p.d + delta)
}

export function todayKey(now: Date = new Date()): string {
  const p = clubParts(now)
  return dayKey(p.y, p.m, p.d)
}

export function dowOf(key: string): number {
  const p = parseKey(key)
  return clubParts(clubMidnight(p.y, p.m, p.d)).dow
}

/** Monday of the club week containing the given day. */
export function weekStartKey(key: string): string {
  const dow = dowOf(key)
  return shiftKey(key, dow === 0 ? -6 : 1 - dow)
}

export function weekDayKeys(start: string, count = 7): string[] {
  return Array.from({ length: count }, (_, i) => shiftKey(start, i))
}

/** Club wall-clock date and time of an ISO instant. */
export function clubClock(iso: string): { dateStr: string; timeStr: string; hour: number } {
  const p = clubParts(new Date(iso))
  return {
    dateStr: `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`,
    timeStr: `${pad(p.hour)}:${pad(p.minute)}`,
    hour: p.hour,
  }
}

/** Every bookable slot start of a day, as HH:MM, on the 90-minute grid. */
export function slotTimes(): string[] {
  const out: string[] = []
  let minutes = OPEN_HOUR * 60
  const close = CLOSE_HOUR * 60
  while (minutes + SLOT_MINUTES <= close) {
    out.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`)
    minutes += SLOT_MINUTES
  }
  return out
}

/**
 * "Mon 6 – Sun 12 Oct", spelling out both months when the span crosses a
 * boundary and adding the year when it crosses one.
 */
export function weekLabel(
  start: string,
  count: number,
  days: readonly string[],
  months: readonly string[],
): string {
  const a = parseKey(start)
  const bKey = shiftKey(start, count - 1)
  const b = parseKey(bKey)
  const head = `${days[dowOf(start)]} ${a.d}`
  const tail = `${days[dowOf(bKey)]} ${b.d} ${months[b.m]}`
  if (a.m === b.m && a.y === b.y) return `${head} – ${tail}`
  const withMonth = `${head} ${months[a.m]} – ${tail}`
  return a.y === b.y ? withMonth : `${withMonth} ${b.y}`
}
