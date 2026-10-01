import { NextResponse } from 'next/server'
import { apiBase, readSignal } from '@/lib/api/base'

export const runtime = 'nodejs'

/**
 * Registration price tiers, straight from what the club configured. Public,
 * like /api/v1/courts/pricing: a member must see the real figure before
 * signing in, and the figure shown is the figure the server will charge.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const upstream = await fetch(`${apiBase()}/api/v1/tournaments/${encodeURIComponent(id)}/pricing`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: readSignal(),
    })
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
