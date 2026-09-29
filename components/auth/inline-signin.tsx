'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@/lib/auth/client'

/**
 * Compact phone+OTP sign-in, embedded inline inside a booking/registration
 * flow rather than redirecting to /login. Goes through the same Next proxies
 * as every other auth entry point, so it shares the one httpOnly-cookie
 * session — a member who signs in mid-checkout does not land in a separate
 * silo from the rest of the app.
 */
export function InlineSignIn({
  onVerified,
  onBack,
  theme = 'dark',
}: {
  onVerified: () => void
  onBack: () => void
  /** Matches the palette of whatever it's embedded in — 'dark' for the navy
   *  padel/tournament pages, 'light' for the cream Pilates track. */
  theme?: 'dark' | 'light'
}) {
  const { refresh } = useAuth()
  const isDark = theme === 'dark'
  const [phase, setPhase] = useState<'phone' | 'name' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const sendCode = useCallback(async () => {
    if (!phone.trim()) {
      setError('Entrez votre numéro de téléphone.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      })
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        setError((data['detail'] as string) ?? 'Échec de l’envoi du code.')
        return
      }
      setPhase(data['isNewUser'] === false ? 'code' : 'name')
    } catch {
      setError('Erreur réseau.')
    } finally {
      setBusy(false)
    }
  }, [phone])

  const verify = useCallback(async () => {
    if (!code.trim()) {
      setError('Entrez le code reçu.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const body: Record<string, string> = { phone: phone.trim(), code: code.trim() }
      if (name.trim()) body['name'] = name.trim()
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
        setError((data['detail'] as string) ?? 'Code invalide.')
        return
      }
      await refresh()
      onVerified()
    } catch {
      setError('Erreur réseau.')
    } finally {
      setBusy(false)
    }
  }, [code, phone, name, refresh, onVerified])

  const label = isDark ? 'text-white/40' : 'text-navy-alt/50'
  const sub = isDark ? 'text-white/60' : 'text-navy-alt/60'
  const inputBorder = isDark ? 'border-white/15 text-white' : 'border-navy-alt/20 text-navy-alt'
  const cta = isDark
    ? 'bg-lime text-navy'
    : 'bg-navy-alt text-cream'
  const back = isDark ? 'text-white/40' : 'text-navy-alt/50'

  return (
    <div className={`rounded-card p-5 sm:p-6 ${isDark ? 'bg-card-navy' : 'bg-cream'}`}>
      <p className={`font-mono text-[0.65rem] tracking-[0.22em] uppercase ${label}`}>Connexion</p>
      <p className={`mt-1 text-[0.8rem] ${sub}`}>Connectez-vous pour finaliser.</p>

      {phase === 'phone' && (
        <div className="mt-3">
          <input
            id="auth-phone-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+216 ..."
            className={`w-full rounded-[0.4rem] border bg-transparent px-3 py-2 text-[0.85rem] outline-none focus:border-lime ${inputBorder}`}
          />
          <button
            type="button"
            id="auth-send-code"
            disabled={busy}
            onClick={() => void sendCode()}
            className={`mt-3 w-full rounded-full py-3 text-[0.85rem] font-bold disabled:opacity-40 ${cta}`}
          >
            {busy ? '…' : 'Recevoir le code'}
          </button>
        </div>
      )}
      {phase === 'name' && (
        <div className="mt-3">
          <input
            id="auth-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre nom"
            className={`w-full rounded-[0.4rem] border bg-transparent px-3 py-2 text-[0.85rem] outline-none focus:border-lime ${inputBorder}`}
          />
          <button type="button" id="auth-name-continue" onClick={() => setPhase('code')} className={`mt-3 w-full rounded-full py-3 text-[0.85rem] font-bold ${cta}`}>
            Continuer
          </button>
        </div>
      )}
      {phase === 'code' && (
        <div className="mt-3">
          <input
            id="auth-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code reçu"
            className={`w-full rounded-[0.4rem] border bg-transparent px-3 py-2 text-[0.85rem] outline-none focus:border-lime ${inputBorder}`}
          />
          <button
            type="button"
            id="auth-verify"
            disabled={busy}
            onClick={() => void verify()}
            className={`mt-3 w-full rounded-full py-3 text-[0.85rem] font-bold disabled:opacity-40 ${cta}`}
          >
            {busy ? '…' : 'Vérifier'}
          </button>
        </div>
      )}

      {error && <p id="auth-error" className="mt-3 text-[0.78rem] text-red-400">{error}</p>}

      <button type="button" onClick={onBack} className={`mt-4 font-mono text-[0.62rem] tracking-[0.1em] ${back}`}>
        ← RETOUR
      </button>
    </div>
  )
}
