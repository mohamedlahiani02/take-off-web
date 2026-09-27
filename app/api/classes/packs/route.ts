import { NextResponse } from 'next/server'
import { apiBase } from '@/lib/api/base'

export const runtime = 'nodejs'

/** The pack catalogue — public, so a visitor sees real prices before signing in. */
export async function GET() {
  try {
    const upstream = await fetch(`${apiBase()}/api/v1/classes/packs`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    })
    if (!upstream.ok) return NextResponse.json({ error: 'Packs unavailable' }, { status: 502 })
    return NextResponse.json(await upstream.json())
  } catch {
    return NextResponse.json({ error: 'Could not reach API' }, { status: 502 })
  }
}
