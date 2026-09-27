import { proxy } from '@/lib/api/server-proxy'

export const runtime = 'nodejs'

/** Cancels the member's own class booking. Credit refund rules (pack vs
 *  single, 24h notice) are decided entirely by the backend. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxy(`/api/v1/classes/bookings/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
