'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/client'

const API = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')

export default function PacksPage() {
  const { isLoading } = useAuth()
  const [packs, setPacks] = useState<Record<string, unknown>[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (isLoading) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('takeoff_access') : null
    fetch(`${API}/api/v1/classes/packs/mine`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => (r.ok ? r.json() : []))
      .then(setPacks)
      .catch(() => setPacks([]))
      .finally(() => setFetching(false))
  }, [isLoading])

  if (isLoading || fetching) {
    return <p className="text-white/40 text-sm">Loading…</p>
  }

  return (
    <div>
      <p className="font-mono text-[13px] tracking-[0.34em] text-lime uppercase mb-4">Account</p>
      <h1 className="font-display text-[clamp(40px,6vw,88px)] leading-none text-white tracking-tight mb-10">
        PACKS
      </h1>
      {packs.length === 0 ? (
        <p className="text-white/40">No packs yet.</p>
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
