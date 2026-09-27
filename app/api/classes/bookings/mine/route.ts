import { proxy } from '@/lib/api/server-proxy'

export const runtime = 'nodejs'

/** The signed-in member's own class bookings. */
export async function GET() {
  return proxy('/api/v1/classes/bookings/mine')
}
