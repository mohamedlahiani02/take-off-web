import { redirect } from 'next/navigation'

/**
 * "Book a court" is the court calendar, which lives at /padel/reserve. This
 * path used to return the general padel page, so the menu entry took members
 * somewhere that could not book anything.
 */
export function GET(): never {
  redirect('/padel/reserve')
}
