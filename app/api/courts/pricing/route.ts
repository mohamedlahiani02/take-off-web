import { NextResponse } from 'next/server'
import { apiBase } from '@/lib/api/base'

export const runtime = 'nodejs'

/**
 * What a booking costs, straight from the API's configuration.
 *
 * Public: a visitor must see the price before signing in. The figure shown is
 * the figure the server will charge — the browser never computes it.
 */
export async function GET() {
  try {
    const upstream = await fetch(`${apiBase()}/api/v1/courts/pricing`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    })
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Pricing unavailable' }, { status: 502 })
    }
    return NextResponse.json(await upstream.json())
  } catch {
    return NextResponse.json({ error: 'Could not reach API' }, { status: 502 })
  }
}
