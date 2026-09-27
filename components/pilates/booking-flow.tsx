'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth/client'
import { InlineSignIn } from '@/components/auth/inline-signin'

export interface PilatesSession {
  id: string
  classTypeId: string
  className: string
  level: string | null
  instructorName: string | null
  startsAt: string
  durationMin: number
  priceDt: number
  maxSpots: number
  bookedSpots: number
  waitlistCount: number
  status: string
  myBookingId: string | null
  myStatus: string | null
}

interface OwnedPack {
  id: string
  status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED'
  creditsRemaining: number | null
  unlimited: boolean
  expiresAt: string
  packName: string
}

type Step = 'recap' | 'signin' | 'done'

interface DoneResult {
  status: 'BOOKED' | 'WAITLIST'
  paidWith: string
  priceDt: number
}

/**
 * The Pilates booking journey, shared by /pilates and /pilates/classes so the
 * two pages cannot drift into two different behaviours (the prototype's
 * /pilates page had its own copy that swallowed a failed API call and showed
 * "Reserved" anyway — see _reserve()'s empty catch block).
 *
 * Nothing is submitted until the member presses confirm on the recap screen,
 * and the result shown is always what the server actually returned — never
 * an optimistic local state.
 */
export function PilatesBookingFlow({
  session,
  onClose,
  onBooked,
}: {
  session: PilatesSession
  onClose: () => void
  onBooked: (bookingId: string, status: 'BOOKED' | 'WAITLIST') => void
}) {
  const { user, isLoading: authLoading } = useAuth()
  const [step, setStep] = useState<Step>('recap')
  const [packs, setPacks] = useState<OwnedPack[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<DoneResult | null>(null)
  const inFlight = useRef(false)

  useEffect(() => {
    if (!user) return
    let active = true
    fetch('/api/classes/packs/mine', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (active) setPacks(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {
        if (active) setPacks([])
      })
    return () => {
      active = false
    }
  }, [user])

  const now = Date.now()
  const validPack = (packs ?? []).find(
    (p) => p.status === 'ACTIVE' && Date.parse(p.expiresAt) > now && (p.unlimited || (p.creditsRemaining ?? 0) > 0),
  )
  const isFull = session.bookedSpots >= session.maxSpots

  const confirm = useCallback(async () => {
    if (inFlight.current) return
    if (!user) {
      setStep('signin')
      return
    }
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      const body: Record<string, unknown> = { sessionId: session.id, quotedPriceDt: session.priceDt }
      if (!validPack || isFull) body['paymentMethod'] = 'WALLET'
      const res = await fetch('/api/classes/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        setError((data['detail'] as string) ?? (data['title'] as string) ?? 'La réservation a été refusée.')
        return
      }
      const status = data['status'] as 'BOOKED' | 'WAITLIST'
      setResult({ status, paidWith: String(data['paidWith'] ?? ''), priceDt: Number(data['priceDt'] ?? 0) })
      setStep('done')
      onBooked(String(data['bookingId']), status)
    } catch {
      setError('Erreur réseau — rien n’a été réservé.')
    } finally {
      setBusy(false)
      inFlight.current = false
    }
  }, [user, session.id, session.priceDt, validPack, isFull, onBooked])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        id="pl-booking-overlay"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[26rem] overflow-y-auto rounded-t-card bg-cream p-5 sm:rounded-card sm:p-6"
      >
        {step === 'done' && result ? (
          <div id="pl-done">
            <p className="font-mono text-[0.75rem] tracking-[0.14em] text-lime-dark">
              {result.status === 'BOOKED' ? 'PLACE CONFIRMÉE' : 'AJOUTÉ·E À LA LISTE D’ATTENTE'}
            </p>
            <p className="mt-2 text-[0.85rem] text-navy-alt/70">
              {result.paidWith === 'PACK'
                ? '1 crédit de votre pack a été utilisé.'
                : result.paidWith === 'UNLIMITED'
                  ? 'Couvert par votre abonnement illimité.'
                  : result.paidWith === 'WAITLIST'
                    ? 'Rien ne vous a été débité.'
                    : `${result.priceDt.toFixed(3)} DT payés depuis votre wallet.`}
            </p>
            {result.status === 'WAITLIST' && (
              <p className="mt-3 text-[0.78rem] leading-relaxed text-navy-alt/50">
                Le cours est complet. Vous serez averti·e si une place se libère.
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-full bg-navy-alt py-3 text-[0.85rem] font-bold text-cream"
            >
              Fermer
            </button>
          </div>
        ) : step === 'signin' ? (
          <InlineSignIn theme="light" onVerified={() => setStep('recap')} onBack={() => setStep('recap')} />
        ) : (
          <div id="pl-recap">
            <p className="font-mono text-[0.65rem] tracking-[0.22em] text-navy-alt/50 uppercase">Réservation</p>
            <h3 className="mt-2 font-display text-[1.4rem] text-navy-alt">{session.className}</h3>
            <p className="mt-1 text-[0.8rem] text-navy-alt/60">
              {session.instructorName ?? 'Coach'} · {session.durationMin} min
            </p>

            <div className="mt-4 rounded-[0.5rem] bg-cream-alt p-4">
              {isFull ? (
                <p className="text-[0.85rem] text-amber-700">
                  Cours complet — vous serez placé·e sur liste d’attente. Rien ne vous sera débité.
                </p>
              ) : user && !authLoading && packs === null ? (
                <p className="text-[0.8rem] text-navy-alt/50">Vérification de vos packs…</p>
              ) : validPack ? (
                <p className="text-[0.85rem] text-lime-dark">
                  1 crédit de « {validPack.packName} » sera utilisé — 0 DT
                </p>
              ) : (
                <div className="flex items-baseline justify-between">
                  <span className="text-[0.85rem] text-navy-alt/70">À régler (wallet)</span>
                  <span id="pl-price" className="font-display text-[1.4rem] text-lime-dark">
                    {session.priceDt.toFixed(3)} DT
                  </span>
                </div>
              )}
            </div>

            {error && <p id="pl-error" className="mt-3 text-[0.78rem] text-red-400">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-navy-alt/25 px-4 py-3 font-mono text-[0.65rem] tracking-[0.1em] text-navy-alt/70"
              >
                ANNULER
              </button>
              <button
                type="button"
                id="pl-confirm"
                disabled={busy}
                onClick={() => void confirm()}
                className="flex-1 rounded-full bg-navy-alt py-3 text-center text-[0.85rem] font-bold text-cream disabled:opacity-40"
              >
                {busy
                  ? '…'
                  : !user
                    ? 'Se connecter et confirmer'
                    : isFull
                      ? 'Rejoindre la liste d’attente'
                      : 'Confirmer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
