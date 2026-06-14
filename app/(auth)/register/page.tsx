'use client'

import Link from 'next/link'
import { Button } from '@/components/primitives/button'

const TRACKS = [
  { value: 'padel', label: 'Padel' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'both', label: 'Both' },
] as const

export default function RegisterPage() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    // TODO: wire to POST /api/auth/register once take-off-api exists
    console.log('register placeholder', Object.fromEntries(data))
  }

  return (
    <>
      <h1 className="font-display text-[clamp(32px,5vw,48px)] text-navy leading-none tracking-tight mb-8">
        CREATE ACCOUNT
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="font-mono text-[11px] tracking-[0.22em] text-navy/60">
            FULL NAME
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className="w-full px-4 py-3 rounded-card bg-cream-alt border border-navy/15 text-navy placeholder:text-navy/35 focus:outline-none focus:border-navy/40 transition-colors"
            placeholder="Your name"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-email" className="font-mono text-[11px] tracking-[0.22em] text-navy/60">
            EMAIL
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full px-4 py-3 rounded-card bg-cream-alt border border-navy/15 text-navy placeholder:text-navy/35 focus:outline-none focus:border-navy/40 transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="font-mono text-[11px] tracking-[0.22em] text-navy/60">
            PHONE
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className="w-full px-4 py-3 rounded-card bg-cream-alt border border-navy/15 text-navy placeholder:text-navy/35 focus:outline-none focus:border-navy/40 transition-colors"
            placeholder="+216 XX XXX XXX"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-password" className="font-mono text-[11px] tracking-[0.22em] text-navy/60">
            PASSWORD
          </label>
          <input
            id="reg-password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-card bg-cream-alt border border-navy/15 text-navy placeholder:text-navy/35 focus:outline-none focus:border-navy/40 transition-colors"
            placeholder="••••••••"
          />
        </div>

        {/* Track selection */}
        <fieldset className="flex flex-col gap-2">
          <legend className="font-mono text-[11px] tracking-[0.22em] text-navy/60 mb-1">
            I&apos;M HERE FOR
          </legend>
          <div className="flex gap-3">
            {TRACKS.map((t) => (
              <label
                key={t.value}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-card border border-navy/15 cursor-pointer has-[:checked]:border-navy has-[:checked]:bg-navy has-[:checked]:text-cream text-navy/60 transition-colors text-sm font-medium"
              >
                <input
                  type="radio"
                  name="track"
                  value={t.value}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        <Button type="submit" variant="primary" size="lg" className="w-full mt-2">
          Create account
        </Button>
      </form>

      <div className="mt-8 flex items-center justify-center font-mono text-[11px] tracking-[0.18em]">
        <Link href="/login" className="text-navy/50 hover:text-navy transition-colors">
          ALREADY HAVE AN ACCOUNT? SIGN IN
        </Link>
      </div>
    </>
  )
}
