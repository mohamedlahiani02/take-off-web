import type { NextRequest } from 'next/server'
import { proxy } from '@/lib/api/server-proxy'

export const runtime = 'nodejs'

/** Books a class session as the signed-in member. */
export async function POST(req: NextRequest) {
  return proxy('/api/v1/classes/bookings', { method: 'POST', body: await req.text() })
}
