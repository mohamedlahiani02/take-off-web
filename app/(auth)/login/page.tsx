'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/primitives/button'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [isNewUser, setIsNewUser] = useState(false)
  const [isGhostClaim, setIsGhostClaim] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputCls =
    'w-full px-4 py-3 rounded-card bg-cream-alt border border-navy/15 text-navy placeholder:text-navy/35 focus:outline-none focus:border-navy/40 transition-colors'

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((d as { detail?: string; error?: string }).detail ?? (d as { detail?: string; error?: string }).error ?? 'Could not send code. Please try again.')
        return
      }
      setIsNewUser(!!(d as { isNewUser?: boolean }).isNewUser)
      setIsGhostClaim(!!(d as { isGhostClaim?: boolean }).isGhostClaim)
      if ((d as { suggestedName?: string }).suggestedName) {
        setName((d as { suggestedName?: string }).suggestedName ?? '')
      }
      setStep('otp')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const body: Record<string, string> = { phone, code }
      if ((isNewUser || isGhostClaim) && name.trim()) body.name = name.trim()
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError((d as { detail?: string; error?: string }).detail ?? (d as { detail?: string; error?: string }).error ?? 'Invalid code. Please try again.')
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

  if (step === 'otp') {
    return (
      <>
        <h1 className="font-display text-[clamp(32px,5vw,48px)] text-navy leading-none tracking-tight mb-2">
          VERIFY
        </h1>
        <p className="font-mono text-[11px] tracking-[0.18em] text-navy/50 mb-8">
          Code sent to {phone} —{' '}
          <button onClick={() => setStep('phone')} className="text-navy underline underline-offset-2">
            change
          </button>
        </p>

        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
          {(isNewUser || isGhostClaim) && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="font-mono text-[11px] tracking-[0.22em] text-navy/60">
                {isGhostClaim ? 'CONFIRM YOUR NAME' : 'YOUR NAME'}
              </label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Full name"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="code" className="font-mono text-[11px] tracking-[0.22em] text-navy/60">
              VERIFICATION CODE
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputCls}
              placeholder="6-digit code"
              maxLength={6}
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={loading}>
            {loading ? 'Verifying…' : 'Sign in'}
          </Button>
        </form>
      </>
    )
  }

  return (
    <>
      <h1 className="font-display text-[clamp(32px,5vw,48px)] text-navy leading-none tracking-tight mb-8">
        SIGN IN
      </h1>

      <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="font-mono text-[11px] tracking-[0.22em] text-navy/60">
            PHONE
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls}
            placeholder="+216 XX XXX XXX"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={loading}>
          {loading ? 'Sending code…' : 'Send code'}
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
