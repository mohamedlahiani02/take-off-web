import { NextResponse } from 'next/server'
import { publicApiBase } from '@/lib/api/base'

export const runtime = 'nodejs'

/**
 * Runtime configuration for statically served pages.
 *
 * The admin console lives in `public/`, so Next cannot template a value into
 * it the way it does for the prototype pages. It used to hard-code the
 * production API, which meant a local or preview console silently drove the
 * live backend while the member site used its own — the two consoles could
 * disagree about what exists.
 *
 * Public on purpose: this is the same origin the browser is already told to
 * call, and it carries no secret.
 */
export async function GET() {
  return NextResponse.json(
    { apiUrl: publicApiBase() },
    { headers: { 'cache-control': 'no-store' } },
  )
}
