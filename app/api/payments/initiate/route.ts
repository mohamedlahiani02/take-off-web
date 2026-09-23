import type { NextRequest } from 'next/server'
import { proxy } from '@/lib/api/server-proxy'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  return proxy('/api/v1/payments/initiate', { method: 'POST', body: await req.text() })
}
