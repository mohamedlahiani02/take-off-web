import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

/**
 * "Schedule" and the class calendar are the same thing; keeping two
 * implementations of one view is how they drift apart. The menu's ?type=
 * filters are preserved so a link to Reformer or Mat still lands filtered.
 */
export function GET(req: NextRequest): never {
  const type = req.nextUrl.searchParams.get('type')
  redirect(type ? `/pilates/classes?type=${encodeURIComponent(type)}` : '/pilates/classes')
}
