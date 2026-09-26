import { redirect } from 'next/navigation'

/**
 * The ladder has no backend: no endpoint serves standings, no admin section
 * manages them, and the padel page carries no ladder content either. Rather
 * than render an invented leaderboard, this sends members to the padel page
 * until the feature exists.
 */
export function GET(): never {
  redirect('/padel')
}
