import { proxy } from '@/lib/api/server-proxy'

export const runtime = 'nodejs'

/** Purchases a pack for the signed-in member. Only settles from the wallet —
 *  the server refuses any other method rather than issue unpaid credits. */
export async function POST(req: Request) {
  return proxy('/api/v1/classes/packs/purchase', { method: 'POST', body: await req.text() })
}
