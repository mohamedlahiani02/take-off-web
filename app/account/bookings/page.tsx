'use client'

import { useCallback, useState } from 'react'
import { useAccountResource } from '@/lib/api/use-account-resource'
import { ResourceNotice } from '@/components/account/resource-state'
import { clubClock, DAYS_EN, MONTHS_EN, dowOf, parseKey } from '@/lib/club-time'

/** "Thu 15 Oct · 09:00", always in the club's timezone. */
function whenLabel(iso: string): string {
  const { dateStr, timeStr } = clubClock(iso)
  const p = parseKey(dateStr)
  return `${DAYS_EN[dowOf(dateStr)]} ${p.d} ${MONTHS_EN[p.m]} · ${timeStr}`
}

function payLabel(status: string): { text: string; tone: string } {
  switch (status) {
    case 'PAID':
      return { text: 'Payé', tone: 'text-lime' }
    case 'PARTIAL':
      return { text: 'Partiellement payé', tone: 'text-amber-400' }
    case 'PAY_AT_CLUB':
      // Never collected, so never shown as paid to work around a display gap.
      return { text: 'À régler au club', tone: 'text-white/60' }
    case 'REFUNDED':
      return { text: 'Remboursé', tone: 'text-white/45' }
    default:
      return { text: 'Non payé', tone: 'text-white/60' }
  }
}

export default function BookingsPage() {
  const { rows: bookings, state } = useAccountResource('/api/courts/bookings')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [cancelled, setCancelled] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState<string | null>(null)

  const cancel = useCallback(async (bookingId: string) => {
    setBusy(bookingId)
    setError('')
    try {
      const res = await fetch(`/api/courts/bookings/${bookingId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
        // The server owns the rule; show exactly what it said.
        setError((body['detail'] as string) ?? (body['title'] as string) ?? 'Annulation impossible.')
        return
      }
      setCancelled((prev) => new Set(prev).add(bookingId))
      setConfirming(null)
    } catch {
      setError('Erreur réseau — rien n’a été annulé.')
    } finally {
      setBusy(null)
    }
  }, [])

  return (
    <div>
      <p className="mb-4 font-mono text-[13px] tracking-[0.34em] text-lime uppercase">Account</p>
      <h1 className="mb-10 font-display text-[clamp(40px,6vw,88px)] leading-none tracking-tight text-white">
        BOOKINGS
      </h1>

      {error && (
        <p id="bk-error" className="mb-5 rounded-card bg-card-navy px-4 py-3 text-[0.88rem] text-red-400">
          {error}
        </p>
      )}

      {state !== 'ready' || bookings.length === 0 ? (
        <ResourceNotice state={state} emptyMessage="No court bookings yet." />
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((b, i) => {
            const id = String(b['bookingId'] ?? i)
            const isCancelled = cancelled.has(id) || b['status'] === 'CANCELLED'
            const pay = payLabel(String(b['paymentStatus'] ?? ''))
            // Eligibility is decided by the server, not re-derived here.
            const canCancel = b['canCancel'] === true && !isCancelled
            const blocked = b['cancelBlockedReason'] as string | undefined

            return (
              <li
                key={id}
                data-booking-id={id}
                className={`rounded-card bg-card-navy p-4 sm:p-5 ${isCancelled ? 'opacity-55' : ''}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[0.95rem] font-medium text-white">
                      {String(b['courtName'] ?? 'Court')}
                      {b['mode'] === 'SHARE' && (
                        <span className="ml-2 rounded-full border border-lime/35 px-2 py-0.5 font-mono text-[0.55rem] tracking-[0.1em] text-lime">
                          PARTAGÉ
                        </span>
                      )}
                    </p>
                    <p className="mt-1 font-mono text-[0.72rem] text-white/50">
                      {b['startsAt'] ? whenLabel(String(b['startsAt'])) : ''}
                    </p>
                    {isCancelled && (
                      <p className="mt-1 font-mono text-[0.65rem] tracking-[0.12em] text-white/40 uppercase">
                        Annulé
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className="font-mono text-[0.85rem] text-lime">
                      {String(b['myShareDt'] ?? b['priceDt'] ?? '')} DT
                    </span>
                    <span className={`font-mono text-[0.62rem] tracking-[0.12em] uppercase ${pay.tone}`}>
                      {pay.text}
                    </span>

                    {canCancel && confirming !== id && (
                      <button
                        type="button"
                        data-cancel-for={id}
                        onClick={() => setConfirming(id)}
                        className="rounded-full border border-white/20 px-4 py-2 font-mono text-[0.62rem] tracking-[0.12em] text-white/70 hover:border-white/40 hover:text-white"
                      >
                        {b['isOrganizer'] === false ? 'QUITTER LE MATCH' : 'ANNULER'}
                      </button>
                    )}

                    {canCancel && confirming === id && (
                      // Cancelling is not undoable, so it is never one click.
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[0.6rem] text-white/50">Confirmer ?</span>
                        <button
                          type="button"
                          data-confirm-cancel={id}
                          disabled={busy === id}
                          onClick={() => void cancel(id)}
                          className="rounded-full bg-lime px-4 py-2 font-mono text-[0.62rem] font-bold tracking-[0.1em] text-navy disabled:opacity-40"
                        >
                          {busy === id ? '…' : 'OUI'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          className="rounded-full border border-white/20 px-3 py-2 font-mono text-[0.62rem] text-white/60"
                        >
                          NON
                        </button>
                      </div>
                    )}

                    {!canCancel && !isCancelled && blocked && (
                      <p
                        data-cancel-blocked={id}
                        className="max-w-[18rem] text-right text-[0.7rem] leading-relaxed text-white/40"
                      >
                        {blocked}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
