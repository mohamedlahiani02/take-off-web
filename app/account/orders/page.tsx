'use client'

import { useAccountResource } from '@/lib/api/use-account-resource'
import { ResourceNotice } from '@/components/account/resource-state'

export default function OrdersPage() {
  const { rows: orders, state } = useAccountResource('/api/orders?page=0&size=20')

  return (
    <div>
      <p className="font-mono text-[13px] tracking-[0.34em] text-lime uppercase mb-4">Account</p>
      <h1 className="font-display text-[clamp(40px,6vw,88px)] leading-none text-white tracking-tight mb-10">
        ORDERS
      </h1>
      {state !== 'ready' || orders.length === 0 ? (
        <ResourceNotice state={state} emptyMessage="No orders yet." />
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
