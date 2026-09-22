import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.phone || !body?.code) {
    return NextResponse.json({ error: 'phone and code are required' }, { status: 400 })
  }

  const apiBase = (process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? '').replace(/\/$/, '')
  if (!apiBase) {
    return NextResponse.json({ error: 'API not configured' }, { status: 503 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${apiBase}/api/v1/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: body.phone, code: body.code }),
    })
  } catch {
    return NextResponse.json({ error: 'Could not reach authentication service' }, { status: 502 })
  }

  const data = await upstream.json().catch(() => ({}))

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status })
  }

  const { accessToken, refreshToken, ...user } = data as {
    accessToken: string
    refreshToken: string
    [key: string]: unknown
  }

  const cookieOpts = {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  }

  const res = NextResponse.json({ user }, { status: 200 })
  res.cookies.set('takeoff_session', accessToken, cookieOpts)
  if (refreshToken) {
    res.cookies.set('takeoff_refresh', refreshToken, cookieOpts)
  }
  const userJson = Buffer.from(JSON.stringify(user)).toString('base64')
  res.cookies.set('takeoff_user', userJson, cookieOpts)

  return res
}
