'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/client'

const API = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')

export default function BookingsPage() {
  const { user, isLoading } = useAuth()
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (isLoading) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('takeoff_access') : null
    fetch(`${API}/api/v1/courts/bookings/mine`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => (r.ok ? r.json() : []))
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setFetching(false))
  }, [isLoading])

  if (isLoading || fetching) {
    return <p className="text-white/40 text-sm">Loading…</p>
  }

  return (
    <div>
      <p className="font-mono text-[13px] tracking-[0.34em] text-lime uppercase mb-4">Account</p>
      <h1 className="font-display text-[clamp(40px,6vw,88px)] leading-none text-white tracking-tight mb-10">
        BOOKINGS
      </h1>
      {bookings.length === 0 ? (
        <p className="text-white/40">No court bookings yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((b, i) => (
            <div key={String(b.bookingId ?? i)} className="rounded-card bg-card-navy p-5 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{String(b.courtName ?? 'Court')}</p>
                <p className="text-white/40 text-sm mt-0.5">
                  {b.startsAt ? new Date(String(b.startsAt)).toLocaleString('fr-TN') : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lime font-mono text-sm">{String(b.priceDt ?? '')} DT</p>
                <p className="text-white/30 text-xs mt-0.5 uppercase">{String(b.paymentStatus ?? '')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
