import Link from 'next/link'
import { Nav } from '@/components/layout/nav'

const SIDEBAR_LINKS = [
  { href: '/account', label: 'Overview' },
  { href: '/account/bookings', label: 'Bookings' },
  { href: '/account/packs', label: 'Packs' },
  { href: '/account/matches', label: 'Matches' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/profile', label: 'Profile' },
] as const

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  // Auth guard: stub that always renders children.
  // requireAuth() will be wired here once take-off-api + session exist.
  // See lib/auth/server-guards.ts for the full pattern.

  return (
    <>
      <Nav theme="dark" />
      <div className="min-h-screen bg-navy pt-24 flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-56 flex-none border-r border-white/8 px-6 py-10 gap-1">
          <p className="font-mono text-[10px] tracking-[0.32em] text-white/30 mb-6">
            MY ACCOUNT
          </p>
          {SIDEBAR_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2.5 rounded-card text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-auto pt-10">
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="font-mono text-[10px] tracking-[0.22em] text-white/30 hover:text-white/60 transition-colors"
              >
                SIGN OUT
              </button>
            </form>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 px-[5vw] py-10">{children}</main>
      </div>
    </>
  )
}
