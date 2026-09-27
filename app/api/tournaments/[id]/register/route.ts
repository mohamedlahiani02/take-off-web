import { proxy } from '@/lib/api/server-proxy'

export const runtime = 'nodejs'

/** Registers the signed-in member for a tournament. Every rule (deadline,
 *  capacity, duplicates, required fields, price, payment) is enforced by the
 *  backend — this only carries the session cookie through as a bearer token. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.text()
  return proxy(`/api/v1/tournaments/${encodeURIComponent(id)}/register`, { method: 'POST', body })
}
