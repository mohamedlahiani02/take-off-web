import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { apiBase } from '@/lib/auth/session'

export const runtime = 'nodejs'

/**
 * Public coaching enquiry. Proxied rather than called from the browser so the
 * API origin stays server-side and the upstream status reaches the form intact.
 */
export async function POST(req: NextRequest) {
  const base = apiBase()
  if (!base) {
    return NextResponse.json({ error: 'API not configured' }, { status: 503 })
  }
  let upstream: Response
  try {
    upstream = await fetch(`${base}/api/v1/coaching/inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: await req.text(),
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ error: 'Could not reach API' }, { status: 502 })
  }
  const text = await upstream.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }
  return NextResponse.json(data, { status: upstream.status })
}
