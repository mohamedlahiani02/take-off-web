import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-alt flex flex-col items-center justify-center px-4 py-16">
      {/* Brand mark */}
      <Link href="/" className="mb-12 flex flex-col items-center gap-2">
        <span className="font-display text-[28px] tracking-[0.14em] text-navy leading-none">
          TAKE OFF
        </span>
        <span className="font-mono text-[10px] tracking-[0.4em] text-navy/40">
          PADEL &middot; PILATES
        </span>
      </Link>

      {/* Auth card */}
      <div className="w-full max-w-md bg-cream rounded-large shadow-sm border border-navy/8 p-10">
        {children}
      </div>
    </div>
  )
}
