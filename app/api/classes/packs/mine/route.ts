import { proxy } from '@/lib/api/server-proxy'

export const runtime = 'nodejs'

/** The signed-in member's own packs and subscriptions. */
export async function GET() {
  return proxy('/api/v1/classes/packs/mine')
}
