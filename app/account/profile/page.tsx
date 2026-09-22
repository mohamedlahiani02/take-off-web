'use client'

import { useAuth } from '@/lib/auth/client'

export default function ProfilePage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <p className="text-white/40 text-sm">Loading…</p>
  }

  return (
    <div>
      <p className="font-mono text-[13px] tracking-[0.34em] text-lime uppercase mb-4">Account</p>
      <h1 className="font-display text-[clamp(40px,6vw,88px)] leading-none text-white tracking-tight mb-10">
        PROFILE
      </h1>
      {user ? (
        <div className="rounded-card bg-card-navy p-8 max-w-md flex flex-col gap-5">
          <div>
            <p className="font-mono text-[10px] tracking-[0.26em] text-white/30 mb-1">NAME</p>
            <p className="text-white">{user.name}</p>
          </div>
          {user.phone && (
            <div>
              <p className="font-mono text-[10px] tracking-[0.26em] text-white/30 mb-1">PHONE</p>
              <p className="text-white">{user.phone}</p>
            </div>
          )}
          {user.email && (
            <div>
              <p className="font-mono text-[10px] tracking-[0.26em] text-white/30 mb-1">EMAIL</p>
              <p className="text-white">{user.email}</p>
            </div>
          )}
          <div>
            <p className="font-mono text-[10px] tracking-[0.26em] text-white/30 mb-1">WALLET</p>
            <p className="text-lime font-mono">
              {typeof user.walletDt === 'number'
                ? `${user.walletDt.toFixed(3)} DT`
                : '—'}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-white/40">Profile unavailable.</p>
      )}
    </div>
  )
}
