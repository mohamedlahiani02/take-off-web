'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/client'

const API = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')

export default function OrdersPage() {
  const { isLoading } = useAuth()
  const [orders, setOrders] = useState<Record<string, unknown>[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (isLoading) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('takeoff_access') : null
    fetch(`${API}/api/v1/orders?page=0&size=20`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => (r.ok ? r.json() : { content: [] }))
      .then(d => setOrders(Array.isArray(d) ? d : (d?.content ?? [])))
      .catch(() => setOrders([]))
      .finally(() => setFetching(false))
  }, [isLoading])

  if (isLoading || fetching) {
    return <p className="text-white/40 text-sm">Loading…</p>
  }

  return (
    <div>
      <p className="font-mono text-[13px] tracking-[0.34em] text-lime uppercase mb-4">Account</p>
      <h1 className="font-display text-[clamp(40px,6vw,88px)] leading-none text-white tracking-tight mb-10">
        ORDERS
      </h1>
      {orders.length === 0 ? (
        <p className="text-white/40">No orders yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o, i) => (
            <div key={String(o.id ?? i)} className="rounded-card bg-card-navy p-5 flex items-center justify-between">
              <div>
                <p className="text-white font-medium font-mono">{String(o.orderRef ?? '')}</p>
                <p className="text-white/40 text-sm mt-0.5">
                  {o.createdAt ? new Date(String(o.createdAt)).toLocaleDateString('fr-TN') : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lime font-mono text-sm">{String(o.totalDt ?? '')} DT</p>
                <p className="text-white/30 text-xs mt-0.5 uppercase">{String(o.statusLabel ?? o.status ?? '')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
