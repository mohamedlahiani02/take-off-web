import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json(null, { status: 401 })
  return NextResponse.json(user)
}
