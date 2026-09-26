import { proxy } from '@/lib/api/server-proxy'

export const runtime = 'nodejs'

/**
 * Cancels the member's own booking, or leaves a shared match.
 *
 * The server owns the decision — whether the notice period still allows it, and
 * what is refunded. This only carries the member's session through.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params
  return proxy(`/api/v1/courts/bookings/${encodeURIComponent(bookingId)}`, { method: 'DELETE' })
}
