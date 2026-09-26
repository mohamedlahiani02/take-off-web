import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Keeps the member signed in across a browsing session, not just for 15 minutes.
 *
 * The access token (`takeoff_session`) is short-lived (JWT_ACCESS_TTL, 900s on
 * the API) so a stolen token stops working quickly. A long-lived refresh token
 * (`takeoff_refresh`) is issued alongside it for exactly this reason — but
 * nothing ever read it: `getSession()` presented the access token once and
 * returned "not authenticated" the moment it expired, which is what silently
 * logged members out mid-visit (e.g. browsing /store).
 *
 * This runs before the page renders, so it can rewrite the request's own
 * cookies (not just the response's) and the render sees the fresh token.
 */

const PRODUCTION_API = 'https://take-off-api.onrender.com'

function apiBase(): string {
  const configured = process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? ''
  return (configured || PRODUCTION_API).replace(/\/$/, '')
}

/** Reads a JWT's exp claim without verifying it — only to decide whether to
 *  refresh early. The API is the only party that verifies the signature. */
function expiresSoon(token: string): boolean {
  try {
    const payload = token.split('.')[1]
    if (!payload) return true
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const { exp } = JSON.parse(json) as { exp?: number }
    if (!exp) return true
    return exp * 1000 - Date.now() < 60_000 // refresh with a minute of headroom
  } catch {
    return true
  }
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
}

export async function proxy(request: NextRequest) {
  const access = request.cookies.get('takeoff_session')?.value
  const refresh = request.cookies.get('takeoff_refresh')?.value

  if (!refresh || (access && !expiresSoon(access))) {
    return NextResponse.next()
  }

  try {
    const upstream = await fetch(`${apiBase()}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })

    if (!upstream.ok) {
      // The refresh token is dead (expired, revoked, or the account changed).
      // Clear the stale cookies rather than looping on a refresh that will
      // never succeed; the page then renders signed out, honestly.
      const res = NextResponse.next()
      res.cookies.delete('takeoff_session')
      res.cookies.delete('takeoff_refresh')
      res.cookies.delete('takeoff_user')
      return res
    }

    const data = (await upstream.json()) as { accessToken?: string; refreshToken?: string }
    if (!data.accessToken) return NextResponse.next()

    // Rewrite the incoming request's cookies BEFORE constructing the response
    // that carries them onward — NextResponse.next({ request }) snapshots
    // `request` at call time, so every mutation has to happen first or this
    // same request still renders signed out and only the *next* one recovers.
    request.cookies.set('takeoff_session', data.accessToken)
    if (data.refreshToken) request.cookies.set('takeoff_refresh', data.refreshToken)

    const res = NextResponse.next({ request })
    res.cookies.set('takeoff_session', data.accessToken, COOKIE_OPTS)
    if (data.refreshToken) res.cookies.set('takeoff_refresh', data.refreshToken, COOKIE_OPTS)
    return res
  } catch {
    // The API is unreachable — proceed with the (possibly stale) cookies
    // rather than failing the request; getSession() will find out for itself.
    return NextResponse.next()
  }
}

export const config = {
  // Skip static assets and the prototype's own asset routes; run everywhere
  // else, since any page or API route may depend on the session.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|prototype/).*)'],
}
