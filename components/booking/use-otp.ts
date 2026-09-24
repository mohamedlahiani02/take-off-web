'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@/lib/auth/client'

export type OtpStep = 'phone' | 'name' | 'code'

/**
 * Phone + OTP sign-in for the booking pages.
 *
 * Goes through the Next proxies, so a member who signs in here gets the same
 * httpOnly cookie session as the rest of the app. The prototype kept its own
 * bearer token in localStorage, which is why signing in on a calendar did not
 * make the account pages or checkout consider you signed in.
 */
export function useOtp(onVerified?: () => void) {
  const { refresh } = useAuth()
  const [step, setStep] = useState<OtpStep>('phone')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = useCallback(() => {
    setStep('phone')
    setPhone('')
    setName('')
    setCode('')
    setBusy(false)
    setError('')
  }, [])

  const sendCode = useCallback(async () => {
    const value = phone.trim()
    if (!value) {
      setError('Please enter your phone number.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: value }),
      })
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        setError((data['detail'] as string) ?? 'Failed to send code. Try again.')
        return
      }
      // Only ask for a name when this phone has no account yet.
      setStep(data['isNewUser'] === false ? 'code' : 'name')
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }, [phone])

  const verify = useCallback(async () => {
    const value = code.trim()
    if (!value) {
      setError('Please enter the verification code.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const body: Record<string, string> = { phone: phone.trim(), code: value }
      if (name.trim()) body['name'] = name.trim()
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
        // A rejected code must never look like a success.
        setError((data['detail'] as string) ?? 'Invalid code. Please try again.')
        return
      }
      // Update the cached identity before resuming, so whatever happens next
      // already sees an authenticated user.
      await refresh()
      onVerified?.()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }, [code, phone, name, refresh, onVerified])

  return {
    step,
    phone,
    setPhone,
    name,
    setName,
    code,
    setCode,
    busy,
    error,
    setError,
    reset,
    sendCode,
    verify,
    nextFromName: () => setStep('code'),
  }
}
