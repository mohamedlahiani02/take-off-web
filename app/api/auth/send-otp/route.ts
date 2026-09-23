import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.phone) {
    return NextResponse.json({ error: 'phone is required' }, { status: 400 })
  }

  const apiBase = (process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? '').replace(/\/$/, '')
  if (!apiBase) {
    return NextResponse.json({ error: 'API not configured' }, { status: 503 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${apiBase}/api/v1/auth/send-otp`, {
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
