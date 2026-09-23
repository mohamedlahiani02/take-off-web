'use client'

import { useAccountResource } from '@/lib/api/use-account-resource'
import { ResourceNotice } from '@/components/account/resource-state'

export default function MatchesPage() {
  const { rows: all, state } = useAccountResource('/api/courts/bookings')
  const matches = all.filter((b) => b.mode === 'SHARE')
  return (
    <div>
      <p className="font-mono text-[13px] tracking-[0.34em] text-lime uppercase mb-4">Account</p>
      <h1 className="font-display text-[clamp(40px,6vw,88px)] leading-none text-white tracking-tight mb-10">
        MATCHES
      </h1>
      {state !== 'ready' || matches.length === 0 ? (
        <ResourceNotice state={state} emptyMessage="No shared matches yet." />
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map((b, i) => (
            <div key={String(b.bookingId ?? i)} className="rounded-card bg-card-navy p-5 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{String(b.courtName ?? 'Court')}</p>
                <p className="text-white/40 text-sm mt-0.5">
                  {b.startsAt ? new Date(String(b.startsAt)).toLocaleString('fr-TN') : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lime font-mono text-sm">{String(b.myShareDt ?? b.priceDt ?? '')} DT</p>
                <p className="text-white/30 text-xs mt-0.5 uppercase">{String(b.mySharePaymentStatus ?? '')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
