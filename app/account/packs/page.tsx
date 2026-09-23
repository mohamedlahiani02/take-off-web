'use client'

import { useAccountResource } from '@/lib/api/use-account-resource'
import { ResourceNotice } from '@/components/account/resource-state'

export default function PacksPage() {
  const { rows: packs, state } = useAccountResource('/api/packs')
  return (
    <div>
      <p className="font-mono text-[13px] tracking-[0.34em] text-lime uppercase mb-4">Account</p>
      <h1 className="font-display text-[clamp(40px,6vw,88px)] leading-none text-white tracking-tight mb-10">
        PACKS
      </h1>
      {state !== 'ready' || packs.length === 0 ? (
        <ResourceNotice state={state} emptyMessage="No packs yet." />
      ) : (
        <div className="flex flex-col gap-3">
          {packs.map((p, i) => (
            <div key={String(p.id ?? i)} className="rounded-card bg-card-navy p-5 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{String(p.packName ?? 'Pack')}</p>
                <p className="text-white/40 text-sm mt-0.5">
                  Expires {p.expiresAt ? new Date(String(p.expiresAt)).toLocaleDateString('fr-TN') : '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lime font-mono text-sm">
                  {p.unlimited ? '∞' : String(p.creditsRemaining ?? 0)} credits
                </p>
                <p className="text-white/30 text-xs mt-0.5 uppercase">{String(p.status ?? '')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
