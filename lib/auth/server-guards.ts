import 'server-only'
import { redirect } from 'next/navigation'
import { getSession } from './session'
import type { User } from '@/lib/api/types'

/**
 * Server-side auth guard for protected layouts and pages.
 *
 * Usage in a server component or layout:
 *   const user = await requireAuth()
 *
 * If there is no session, redirects to /login (Next.js redirect throws,
 * so the function never returns null in practice).
 */
export async function requireAuth(): Promise<User> {
  const user = await getSession()
  if (!user) {
    redirect('/login')
  }
  return user
}
