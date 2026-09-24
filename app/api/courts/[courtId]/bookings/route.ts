import type { NextRequest } from 'next/server'
import { proxy } from '@/lib/api/server-proxy'

export const runtime = 'nodejs'

/** Books a court slot as the signed-in member (cookie session, no bearer token). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courtId: string }> },
) {
  const { courtId } = await params
  return proxy(`/api/v1/courts/${encodeURIComponent(courtId)}/bookings`, {
    method: 'POST',
    body: await req.text(),
  })
}
