import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { apiBase } from '@/lib/auth/session'

interface ProxyInit {
  method?: string
  body?: string
}

/**
 * Forwards a browser request to the API using the httpOnly session cookie as the bearer
 * credential, so protected pages never need a token in `localStorage`.
 *
 * Upstream status codes are passed through unchanged: an expired or missing session must reach
 * the UI as 401 rather than being flattened into an empty list, which previously made "signed
 * out" indistinguishable from "no orders yet".
 */
export async function proxy(path: string, init: ProxyInit = {}): Promise<NextResponse> {
  const token = (await cookies()).get('takeoff_session')?.value
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const base = apiBase()
  if (!base) {
    return NextResponse.json({ error: 'API not configured' }, { status: 503 })
  }

  let upstream: Response
  try {
    upstream = await fetch(base + path, {
      method: init.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...(init.body === undefined ? {} : { body: init.body }),
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
