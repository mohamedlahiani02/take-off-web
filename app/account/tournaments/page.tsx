'use client'

import { useAccountResource } from '@/lib/api/use-account-resource'
import { ResourceNotice } from '@/components/account/resource-state'
import { clubClock, DAYS_EN, MONTHS_EN, dowOf, parseKey } from '@/lib/club-time'

function whenLabel(iso?: string): string {
  if (!iso) return '—'
  const { dateStr, timeStr } = clubClock(iso)
  const p = parseKey(dateStr)
  return `${DAYS_EN[dowOf(dateStr)]} ${p.d} ${MONTHS_EN[p.m]} · ${timeStr}`
}

function statusLabel(status: string): { text: string; tone: string } {
  switch (status) {
    case 'CONFIRMED':
      return { text: 'Confirmée', tone: 'text-lime' }
    case 'PENDING':
      return { text: 'En attente de validation', tone: 'text-amber-400' }
    case 'WAITLIST':
      return { text: 'Liste d’attente', tone: 'text-white/60' }
    case 'REJECTED':
      return { text: 'Refusée', tone: 'text-red-400' }
    case 'CANCELLED':
      return { text: 'Annulée', tone: 'text-white/40' }
    default:
      return { text: status, tone: 'text-white/60' }
  }
}

function payLabel(status: string): string {
  switch (status) {
    case 'PAID':
      return 'Payé'
    case 'PAY_AT_CLUB':
      return 'À régler au club'
    case 'REFUNDED':
      return 'Remboursé'
    default:
      return 'Non payé'
  }
}

export default function TournamentsPage() {
  const { rows, state } = useAccountResource('/api/tournaments/registrations/mine')

  return (
    <div>
      <p className="mb-4 font-mono text-[13px] tracking-[0.34em] text-lime uppercase">Account</p>
      <h1 className="mb-10 font-display text-[clamp(40px,6vw,88px)] leading-none tracking-tight text-white">
        TOURNAMENTS
      </h1>

      {state !== 'ready' || rows.length === 0 ? (
        <ResourceNotice state={state} emptyMessage="No tournament registrations yet." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r, i) => {
            const id = String(r['id'] ?? i)
            const status = statusLabel(String(r['status'] ?? ''))
            return (
              <li key={id} data-registration-id={id} className="rounded-card bg-card-navy p-4 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[0.95rem] font-medium text-white">
                      {String(r['tournamentTitle'] ?? 'Tournoi')}
                    </p>
                    <p className="mt-1 font-mono text-[0.72rem] text-white/50">
                      {whenLabel(r['startsAt'] as string | undefined)}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-1 sm:items-end">
                    <span className={`font-mono text-[0.68rem] tracking-[0.1em] uppercase ${status.tone}`}>
                      {status.text}
                    </span>
                    <span className="font-mono text-[0.65rem] text-white/45">
                      {payLabel(String(r['paymentStatus'] ?? ''))}
                      {' · '}
                      {String(r['amountPaidDt'] ?? '0')} DT
                    </span>
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
