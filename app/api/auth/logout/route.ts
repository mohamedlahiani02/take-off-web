import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

/**
 * POST /api/auth/logout
 *
 * Clears the session cookie. Does not call the API backend — the access token
 * will expire on its own (15-min TTL); the refresh token stays in Redis until
 * it expires or is rotated. A future version should also call
 * POST /v1/auth/logout to invalidate the refresh token server-side.
 */
export async function POST() {
  const cookieStore = await cookies()
  const cookieName = process.env['SESSION_COOKIE_NAME'] ?? 'takeoff_session'

  cookieStore.delete(cookieName)

  return NextResponse.redirect(new URL('/', process.env['NEXT_PUBLIC_API_URL'] ?? '/'), {
    status: 302,
  })
}
