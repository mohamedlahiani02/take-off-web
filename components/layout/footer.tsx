import Link from 'next/link'
import { cn } from '@/lib/cn'

interface FooterProps {
  theme?: 'dark' | 'light'
}

const LINKS = {
  Padel: [
    { href: '/padel/booking', label: 'Book a court' },
    { href: '/padel/tournaments', label: 'Tournaments' },
    { href: '/padel/ladder', label: 'Ladder' },
    { href: '/coaches', label: 'Coaches' },
  ],
  Pilates: [
    { href: '/pilates/schedule', label: 'Schedule' },
    { href: '/coaches', label: 'Instructors' },
  ],
  Store: [
    { href: '/store', label: 'All products' },
    { href: '/store?cat=rackets', label: 'Rackets' },
    { href: '/store?cat=pilates', label: 'Pilates gear' },
  ],
  Club: [
    { href: '/account', label: 'My account' },
    { href: '/login', label: 'Sign in' },
  ],
} as const

export function Footer({ theme = 'dark' }: FooterProps) {
  const isDark = theme === 'dark'

  return (
    <footer
      className={cn(
        'border-t px-[8vw] py-16',
        isDark ? 'bg-navy border-white/8 text-white' : 'bg-cream border-navy/8 text-navy',
      )}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
        {(Object.keys(LINKS) as Array<keyof typeof LINKS>).map((section) => (
          <div key={section}>
            <p
              className={cn(
                'font-mono text-[10px] tracking-[0.34em] mb-5',
                isDark ? 'text-white/35' : 'text-navy/35',
              )}
            >
              {section.toUpperCase()}
            </p>
            <ul className="flex flex-col gap-3">
              {LINKS[section].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      'text-sm transition-colors',
                      isDark ? 'text-white/55 hover:text-white' : 'text-navy/55 hover:text-navy',
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div
        className={cn(
          'flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-8 border-t',
          isDark ? 'border-white/8' : 'border-navy/8',
        )}
      >
        <div className="flex flex-col gap-1">
          <span className="font-display text-[18px] tracking-[0.14em] leading-none">
            TAKE OFF
          </span>
          <span
            className={cn(
              'font-mono text-[9px] tracking-[0.36em]',
              isDark ? 'text-white/35' : 'text-navy/35',
            )}
          >
            PADEL &middot; PILATES &middot; TUNIS
          </span>
        </div>

        <a
          href="tel:+21627314100"
          className={cn(
            'font-mono text-[12px] tracking-[0.22em] transition-colors',
            isDark ? 'text-lime hover:text-lime/80' : 'text-lime-dark hover:text-lime-dark/80',
          )}
        >
          +216 27 314 100
        </a>

        <p className={cn('font-mono text-[10px] tracking-[0.18em]', isDark ? 'text-white/25' : 'text-navy/25')}>
          &copy; {new Date().getFullYear()} Take Off Club
        </p>
      </div>
    </footer>
  )
}
