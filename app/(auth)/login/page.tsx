'use client'

import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/primitives/button'

// Note: metadata exports are ignored in client components — move to a parent
// server component wrapper if SEO for this page becomes important.

export default function LoginPage() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    // TODO: wire to POST /api/auth/login once take-off-api exists
    console.log('login placeholder', Object.fromEntries(data))
  }

  return (
    <>
      <h1 className="font-display text-[clamp(32px,5vw,48px)] text-navy leading-none tracking-tight mb-8">
        SIGN IN
      </h1>

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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="font-mono text-[11px] tracking-[0.22em] text-navy/60">
            PASSWORD
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-card bg-cream-alt border border-navy/15 text-navy placeholder:text-navy/35 focus:outline-none focus:border-navy/40 transition-colors"
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full mt-2">
          Sign in
        </Button>
      </form>

      <div className="mt-8 flex flex-col items-center gap-3 font-mono text-[11px] tracking-[0.18em]">
        <Link href="/forgot" className="text-navy/50 hover:text-navy transition-colors">
          FORGOT PASSWORD
        </Link>
        <span className="text-navy/25">&middot;</span>
        <Link href="/register" className="text-navy/50 hover:text-navy transition-colors">
          CREATE AN ACCOUNT
        </Link>
      </div>
    </>
  )
}
