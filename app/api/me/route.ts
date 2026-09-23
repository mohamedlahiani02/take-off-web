import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function GET() {
  // getSession validates the token against the API; an unsigned profile cookie is not a session.
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  return NextResponse.json(user)
}
