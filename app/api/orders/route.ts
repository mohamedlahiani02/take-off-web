import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('takeoff_session')?.value

  const apiBase = (process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? '').replace(/\/$/, '')
  if (!apiBase) {
    return NextResponse.json({ error: 'API not configured' }, { status: 503 })
  }

  const body = await req.text()

  let upstream: Response
  try {
    upstream = await fetch(`${apiBase}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    })
  } catch {
    return NextResponse.json({ error: 'Could not reach API' }, { status: 502 })
  }

  const data = await upstream.json().catch(() => ({}))
  return NextResponse.json(data, { status: upstream.status })
}
