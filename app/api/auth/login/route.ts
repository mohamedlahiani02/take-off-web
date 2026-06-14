import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * POST /api/auth/login
 *
 * Placeholder — returns 501 until take-off-api exists.
 *
 * When implemented, this handler will:
 *  1. Call Spring POST /v1/auth/login with {email, password}.
 *  2. Receive {accessToken, refreshToken}.
 *  3. Write both as HttpOnly · Secure · SameSite=Lax cookies.
 *  4. Return the user shape to the client.
 *
 * See ARCHITECTURE.md §6 Auth flow for the full sequence.
 */
export async function POST() {
  return NextResponse.json(
    {
      type: 'https://takeoff.tn/problems/not-implemented',
      title: 'Not Implemented',
      status: 501,
      code: 'takeoff.auth.not_implemented',
      detail: 'The API backend (take-off-api) is not yet connected. See ARCHITECTURE.md §6.',
    },
    { status: 501 },
  )
}
