import { proxy } from '@/lib/api/server-proxy'

export const runtime = 'nodejs'

/** The signed-in member's own tournament registrations, for their profile. */
export async function GET() {
  return proxy('/api/v1/tournaments/registrations/mine')
}
