import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { apiBase } from '@/lib/auth/session'

export const runtime = 'nodejs'

/**
 * POST /api/auth/logout
 *
 * Revokes the session on the API first, then clears the local cookies. Clearing cookies alone
 * left the refresh token usable, so anyone holding it could mint fresh access tokens after the
 * member believed they had signed out. The API call deletes the member's stored refresh tokens.
 *
 * Cookies are cleared even when the revocation call fails, so a member can always sign out of
 * this browser; the token then expires on its own schedule.
 */
export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('takeoff_session')?.value
  const base = apiBase()

  if (token && base) {
    try {
      await fetch(`${base}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
    } catch {
      // Local sign-out must still succeed if the API is unreachable.
    }
  }

  cookieStore.delete('takeoff_session')
  cookieStore.delete('takeoff_refresh')
  cookieStore.delete('takeoff_user')

  // Resolve against the caller's own origin so the sign-out form works on any host/port.
  return NextResponse.redirect(new URL('/', req.url), { status: 302 })
}
