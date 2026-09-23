import 'server-only'
import { cookies } from 'next/headers'
import type { User } from '@/lib/api/types'

export function apiBase(): string {
  return (process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? '').replace(/\/$/, '')
}

/**
 * Resolves who the caller actually is, by presenting the session token to the API.
 *
 * The `takeoff_user` cookie is an unsigned display cache written at login — it is never an
 * authentication input. Trusting it meant anyone could mint a profile cookie and be treated as
 * signed in. Authority lives with the token and the account state behind it, so a blocked,
 * deleted or logged-out account stops resolving here even while the cookie lingers.
 */
export async function getSession(): Promise<User | null> {
  const token = (await cookies()).get('takeoff_session')?.value
  if (!token) return null

  const base = apiBase()
  if (!base) return null

  try {
    const res = await fetch(`${base}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as User
  } catch {
    return null
  }
}
