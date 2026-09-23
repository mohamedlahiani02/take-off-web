import { proxy } from '@/lib/api/server-proxy'

export const runtime = 'nodejs'

/** The signed-in member's court bookings — organised and joined. */
export async function GET() {
  return proxy('/api/v1/courts/bookings/mine')
}
