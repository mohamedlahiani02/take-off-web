import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { apiBase } from '@/lib/api/base'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.phone) {
    return NextResponse.json({ error: 'phone is required' }, { status: 400 })
  }

  // apiBase() always resolves — it falls back to the production API instead of
  // returning empty, so a missing env var on this deployment never turns into a
  // fake "API not configured" refusal (which is what a local reimplementation
  // of this lookup, without the fallback, used to produce here).
  let upstream: Response
  try {
    upstream = await fetch(`${apiBase()}/api/v1/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: body.phone }),
    })
  } catch {
    return NextResponse.json({ error: 'Could not reach authentication service' }, { status: 502 })
  }

  const data = await upstream.json().catch(() => ({}))
  return NextResponse.json(data, { status: upstream.status })
}
