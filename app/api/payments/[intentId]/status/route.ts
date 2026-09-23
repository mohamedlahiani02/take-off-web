import { proxy } from '@/lib/api/server-proxy'

export const runtime = 'nodejs'

/**
 * Authoritative settlement state for one payment intent. The confirmation screen polls this —
 * it never infers "paid" from having been redirected back.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ intentId: string }> },
) {
  const { intentId } = await params
  return proxy(`/api/v1/payments/${encodeURIComponent(intentId)}/status`)
}
