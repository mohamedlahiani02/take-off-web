'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/primitives/button'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError((d as { detail?: string }).detail ?? 'Could not send code. Try again.')
        return
      }
      setStep('code')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError((d as { detail?: string }).detail ?? 'Invalid code. Please try again.')
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

      {step === 'phone' ? (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="font-mono text-[11px] tracking-[0.22em] text-navy/60">
              PHONE NUMBER
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
            {loading ? 'Sending…' : 'Send code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-col gap-5">
          <p className="text-sm text-navy/60">
            A code was sent to <strong>{phone}</strong>.{' '}
            <button type="button" onClick={() => setStep('phone')} className="underline">
              Change
            </button>
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="code" className="font-mono text-[11px] tracking-[0.22em] text-navy/60">
              VERIFICATION CODE
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputCls}
              placeholder="000000"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={loading}>
            {loading ? 'Verifying…' : 'Sign in'}
          </Button>
        </form>
      )}

      <div className="mt-8 flex flex-col items-center gap-3 font-mono text-[11px] tracking-[0.18em]">
        <Link href="/register" className="text-navy/50 hover:text-navy transition-colors">
          CREATE AN ACCOUNT
        </Link>
      </div>
    </>
  )
}
