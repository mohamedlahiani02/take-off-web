'use client'

import Link from 'next/link'
import { Button } from '@/components/primitives/button'

export default function ResetPage() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    // TODO: wire to POST /api/auth/reset-password once take-off-api exists
    console.log('reset password placeholder', Object.fromEntries(data))
  }

  return (
    <>
      <h1 className="font-display text-[clamp(28px,4.5vw,42px)] text-navy leading-none tracking-tight mb-3">
        RESET PASSWORD
      </h1>
      <p className="text-navy/55 text-sm mb-8">Choose a new password for your account.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="font-mono text-[11px] tracking-[0.22em] text-navy/60">
            NEW PASSWORD
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-card bg-cream-alt border border-navy/15 text-navy placeholder:text-navy/35 focus:outline-none focus:border-navy/40 transition-colors"
            placeholder="••••••••"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm" className="font-mono text-[11px] tracking-[0.22em] text-navy/60">
            CONFIRM PASSWORD
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-card bg-cream-alt border border-navy/15 text-navy placeholder:text-navy/35 focus:outline-none focus:border-navy/40 transition-colors"
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full mt-2">
          Set new password
        </Button>
      </form>

      <div className="mt-8 text-center">
        <Link href="/login" className="font-mono text-[11px] tracking-[0.18em] text-navy/50 hover:text-navy transition-colors">
          BACK TO SIGN IN
        </Link>
      </div>
    </>
  )
}
