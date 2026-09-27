import { NextResponse } from 'next/server'
import { apiBase } from '@/lib/api/base'

export const runtime = 'nodejs'

/**
 * The registration form's fields, straight from what the club configured.
 *
 * Public: a visitor previews the form before signing in. Drafts 404 here the
 * same way they do everywhere else on the public tournament endpoints.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const upstream = await fetch(`${apiBase()}/api/v1/tournaments/${encodeURIComponent(id)}/fields`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
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
