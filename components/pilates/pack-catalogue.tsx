'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/client'
import { InlineSignIn } from '@/components/auth/inline-signin'

interface PackType {
  id: string
  name: string
  activity: 'PADEL' | 'PILATES'
  priceDt: number
  creditCount: number | null
  unlimited: boolean
  validityMonths: number
  active: boolean
}

/**
 * Pack catalogue with real purchase — settles from the wallet only (the
 * server refuses any other method rather than issue unpaid credits), and the
 * price shown is exactly what gets charged.
 */
/** Defaults to the pilates track; the padel page passes 'PADEL'. Both sell
 *  packs through the same endpoint and the same wallet-only purchase rule. */
export function PackCatalogue({ activity = 'PILATES' }: { activity?: 'PADEL' | 'PILATES' } = {}) {
  const { user } = useAuth()
  const [packs, setPacks] = useState<PackType[] | null>(null)
  const [buying, setBuying] = useState<PackType | null>(null)
  const [signinFirst, setSigninFirst] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/classes/packs', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: PackType[]) => {
        if (active) setPacks((Array.isArray(rows) ? rows : []).filter((p) => p.activity === activity && p.active))
      })
      .catch(() => {
        if (active) setPacks([])
      })
    return () => {
      active = false
    }
  }, [activity])

  const purchase = useCallback(async () => {
    if (!buying) return
    if (!user) {
      setSigninFirst(true)
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/classes/packs/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packTypeId: buying.id, paymentMethod: 'WALLET', quantity: 1 }),
      })
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        setError((data['detail'] as string) ?? (data['title'] as string) ?? 'Achat refusé.')
        return
      }
      setDone(buying.name)
      setBuying(null)
    } catch {
      setError('Erreur réseau — rien n’a été débité.')
    } finally {
      setBusy(false)
    }
  }, [buying, user])

  if (!packs || packs.length === 0) return null

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packs.map((p) => (
          <div key={p.id} className="rounded-card border border-navy-alt/10 bg-white p-5">
            <p className="font-mono text-[0.6rem] tracking-[0.14em] text-lime-dark uppercase">
              {p.unlimited ? 'Illimité' : `${p.creditCount} cours`}
            </p>
            <h3 className="mt-2 font-display text-[1.3rem] text-navy-alt">{p.name}</h3>
            <p className="mt-1 font-mono text-[0.68rem] text-navy-alt/50">Valable {p.validityMonths} mois</p>
            <p className="mt-4 font-display text-[1.8rem] text-navy-alt">{p.priceDt.toFixed(3)} DT</p>
            <button
              type="button"
              onClick={() => {
                setBuying(p)
                setSigninFirst(false)
                setDone(null)
                setError('')
              }}
              className="mt-4 w-full rounded-full bg-navy-alt py-3 text-[0.85rem] font-bold text-cream"
            >
              Acheter
            </button>
          </div>
        ))}
      </div>

      {buying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setBuying(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[24rem] rounded-card bg-cream p-6">
            {signinFirst ? (
              <InlineSignIn theme="light" onVerified={() => setSigninFirst(false)} onBack={() => setBuying(null)} />
            ) : (
              <>
                <p className="font-mono text-[0.6rem] tracking-[0.14em] text-navy-alt/50 uppercase">Confirmer l’achat</p>
                <h3 className="mt-2 font-display text-[1.3rem] text-navy-alt">{buying.name}</h3>
                <div className="mt-3 flex items-baseline justify-between rounded-[0.5rem] bg-cream-alt p-4">
                  <span className="text-[0.85rem] text-navy-alt/70">À régler (wallet)</span>
                  <span className="font-display text-[1.4rem] text-lime-dark">{buying.priceDt.toFixed(3)} DT</span>
                </div>
                {error && <p className="mt-3 text-[0.78rem] text-red-500">{error}</p>}
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBuying(null)}
                    className="rounded-full border border-navy-alt/25 px-4 py-3 font-mono text-[0.65rem] text-navy-alt/70"
                  >
                    ANNULER
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void purchase()}
                    className="flex-1 rounded-full bg-navy-alt py-3 text-[0.85rem] font-bold text-cream disabled:opacity-40"
                  >
                    {busy ? '…' : !user ? 'Se connecter et confirmer' : 'Confirmer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {done && (
        <p className="mt-4 rounded-[0.5rem] bg-white px-4 py-3 text-[0.82rem] text-lime-dark">
          « {done} » acheté — vos crédits sont disponibles dans votre compte.
        </p>
      )}
    </div>
  )
}
