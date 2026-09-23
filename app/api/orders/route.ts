import type { NextRequest } from 'next/server'
import { proxy } from '@/lib/api/server-proxy'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get('page') ?? '0'
  const size = req.nextUrl.searchParams.get('size') ?? '20'
  return proxy(`/api/v1/orders?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`)
}

export async function POST(req: NextRequest) {
  return proxy('/api/v1/orders', { method: 'POST', body: await req.text() })
}
