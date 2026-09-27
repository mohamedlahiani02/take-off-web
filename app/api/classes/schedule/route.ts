import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { apiBase } from '@/lib/api/base'

export const runtime = 'nodejs'

/**
 * The class schedule is public, but carries member-specific fields
 * (myBookingId, myStatus) when the caller is authenticated. A direct
 * browser fetch could send a bearer token stored in localStorage, but this
 * app deliberately keeps the session in an httpOnly cookie — invisible to
 * client JS — so this route is what forwards it: soft auth, never a 401,
 * the member fields just come back empty when signed out.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (!from || !to) {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
  }

  const token = (await cookies()).get('takeoff_session')?.value
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const upstream = await fetch(
      `${apiBase()}/api/v1/classes/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { headers, cache: 'no-store' },
    )
    const text = await upstream.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
    return NextResponse.json(data, { status: upstream.status })
  } catch {
    return NextResponse.json({ error: 'Could not reach API' }, { status: 502 })
  }
}
