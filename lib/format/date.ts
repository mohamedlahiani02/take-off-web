/**
 * Date formatter utilities for the Africa/Tunis timezone.
 * All dates from the API are UTC ISO-8601; display always uses Tunis local time.
 */

const TIMEZONE = 'Africa/Tunis'

/**
 * Formats a Date (or ISO string) as a locale-aware date string in Tunis time.
 *
 * @example formatDate(new Date('2025-07-04T18:00:00Z')) // "Friday, 4 July 2025"
 */
export function formatDate(d: Date | string, locale = 'fr-TN'): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat(locale, {
    timeZone: TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Formats a Date (or ISO string) as a short time string in Tunis time.
 *
 * @example formatTime(new Date('2025-07-04T18:00:00Z')) // "19:00"
 */
export function formatTime(d: Date | string, locale = 'fr-TN'): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat(locale, {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/**
 * Formats a Date as a short date label — used in calendar views.
 *
 * @example formatShortDate(new Date('2025-07-04T00:00:00Z')) // "04 Jul"
 */
export function formatShortDate(d: Date | string, locale = 'fr-TN'): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat(locale, {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
  }).format(date)
}
