'use client'

import Link from 'next/link'
import { Button } from '@/components/primitives/button'

export default function ForgotPage() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    // TODO: wire to POST /api/auth/forgot-password once take-off-api exists
    console.log('forgot password placeholder', Object.fromEntries(data))
  }

  return (
    <>
      <h1 className="font-display text-[clamp(28px,4.5vw,42px)] text-navy leading-none tracking-tight mb-3">
        FORGOT PASSWORD
      </h1>
      <p className="text-navy/55 text-sm mb-8">
        Enter your email and we&apos;ll send a reset link.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="font-mono text-[11px] tracking-[0.22em] text-navy/60">
            EMAIL
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full px-4 py-3 rounded-card bg-cream-alt border border-navy/15 text-navy placeholder:text-navy/35 focus:outline-none focus:border-navy/40 transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full mt-2">
          Send reset link
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
