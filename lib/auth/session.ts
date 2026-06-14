import 'server-only'
import { cookies } from 'next/headers'
import type { User } from '@/lib/api/types'

/**
 * Server-only session helper.
 *
 * Reads the HttpOnly session cookie and returns the decoded user shape,
 * or null if no valid session exists.
 *
 * Currently a stub that always returns null. Once take-off-api is live,
 * this will:
 *  1. Read the access token from the cookie.
 *  2. Optionally verify its JWT signature (RS256) locally.
 *  3. Fall back to calling GET /v1/me if the token needs refresh.
 */
export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies()
  const cookieName = process.env['SESSION_COOKIE_NAME'] ?? 'takeoff_session'
  const token = cookieStore.get(cookieName)

  if (!token) return null

  // TODO: decode and validate the JWT, then fetch /v1/me or derive user from claims
  return null
}
