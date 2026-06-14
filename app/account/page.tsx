import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Account Overview',
}

export default function AccountOverviewPage() {
  return (
    <div>
      <p className="font-mono text-[13px] tracking-[0.34em] text-lime uppercase mb-4">
        Account
      </p>
      <h1 className="font-display text-[clamp(40px,6vw,88px)] leading-none text-white tracking-tight">
        OVERVIEW
      </h1>
      <p className="mt-6 text-white/50 max-w-md">
        01 — Your bookings, packs, wallet balance, and match history will appear here.
        Coming soon.
      </p>

      {/* Placeholder stat cards */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        {['Bookings', 'Packs', 'Matches', 'Wallet'].map((label) => (
          <div key={label} className="rounded-card bg-card-navy p-6">
            <p className="font-mono text-[10px] tracking-[0.26em] text-white/30 mb-3">
              {label.toUpperCase()}
            </p>
            <p className="font-display text-4xl text-white/20">—</p>
          </div>
        ))}
      </div>
    </div>
  )
}
