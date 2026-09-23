import Link from 'next/link'
import type { ResourceState } from '@/lib/api/use-account-resource'

/**
 * Shared rendering for the non-list states of an account collection, so every account page
 * reports an expired session the same way instead of showing a misleading empty list.
 * Returns null once there is real data to render.
 */
export function ResourceNotice({
  state,
  emptyMessage,
}: {
  state: ResourceState
  emptyMessage: string
}) {
  if (state === 'loading') {
    return <p className="text-white/40 text-sm">Loading…</p>
  }
  if (state === 'unauthenticated') {
    return (
      <p className="text-white/50">
        Your session has expired.{' '}
        <Link href="/login" className="text-lime underline underline-offset-4">
          Sign in again
        </Link>{' '}
        to see this page.
      </p>
    )
  }
  if (state === 'error') {
    return <p className="text-white/50">We couldn’t load this right now. Please try again shortly.</p>
  }
  return <p className="text-white/40">{emptyMessage}</p>
}
