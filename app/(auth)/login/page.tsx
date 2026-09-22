'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/primitives/button'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError((d as { detail?: string; error?: string }).detail ?? (d as { detail?: string; error?: string }).error ?? 'Invalid credentials. Please try again.')
        return
      }
      router.push('/account')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full px-4 py-3 rounded-card bg-cream-alt border border-navy/15 text-navy placeholder:text-navy/35 focus:outline-none focus:border-navy/40 transition-colors'

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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-8 flex flex-col items-center gap-3 font-mono text-[11px] tracking-[0.18em]">
        <Link href="/register" className="text-navy/50 hover:text-navy transition-colors">
          CREATE AN ACCOUNT
        </Link>
      </div>
    </>
  )
}
