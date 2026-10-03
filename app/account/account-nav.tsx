'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

export const ACCOUNT_LINKS = [
  { href: '/account', label: 'Aperçu' },
  { href: '/account/bookings', label: 'Réservations' },
  { href: '/account/packs', label: 'Forfaits' },
  { href: '/account/matches', label: 'Matchs' },
  { href: '/account/tournaments', label: 'Tournois' },
  { href: '/account/orders', label: 'Commandes' },
  { href: '/account/profile', label: 'Profil' },
] as const

/**
 * Account navigation. Renders as a sidebar on desktop and a horizontal
 * scroller on mobile — the previous sidebar was `hidden md:flex`, which
 * left phone users with no way at all to move between account pages.
 * The current page is marked, so it is clear where you are.
 */
export function AccountNav({ variant }: { variant: 'sidebar' | 'bar' }) {
  const pathname = usePathname()
  const isCurrent = (href: string) =>
    href === '/account' ? pathname === '/account' : pathname.startsWith(href)

  if (variant === 'bar') {
    return (
      <nav
        aria-label="Mon compte"
        className="flex gap-2 overflow-x-auto border-b border-white/8 px-[5vw] py-3 md:hidden"
      >
        {ACCOUNT_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isCurrent(link.href) ? 'page' : undefined}
            className={cn(
              'rounded-full px-4 py-2 font-mono text-[0.68rem] tracking-[0.1em] whitespace-nowrap transition-colors',
              isCurrent(link.href)
                ? 'bg-lime text-navy font-bold'
                : 'border border-white/15 text-white/60 hover:text-white',
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    )
  }

  return (
    <nav aria-label="Mon compte" className="flex flex-col gap-1">
      {ACCOUNT_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isCurrent(link.href) ? 'page' : undefined}
          className={cn(
            'rounded-card px-3 py-2.5 text-sm transition-colors',
            isCurrent(link.href)
              ? 'bg-lime/10 font-semibold text-lime'
              : 'text-white/60 hover:bg-white/5 hover:text-white',
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
