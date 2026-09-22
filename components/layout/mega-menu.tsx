'use client'

/**
 * Mega menu — full-viewport overlay with tabbed navigation.
 * React port of prototype/menu.js concept. Currently a flat panel;
 * the animated, image-thumbnail version from the prototype will be
 * ported in a later sprint.
 */
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface MenuSection {
  n: string
  title: string
  links: { href: string; label: string }[]
}

interface MenuCategory {
  key: string
  label: string
  sections: MenuSection[]
}

const MENU: MenuCategory[] = [
  {
    key: 'padel',
    label: 'Padel',
    sections: [
      {
        n: '01',
        title: 'Play',
        links: [
          { href: '/padel/booking', label: 'Book a court' },
          { href: '/padel/ladder', label: 'Ladder' },
          { href: '/padel/tournaments', label: 'Tournaments' },
          { href: '/coaches', label: 'Coaching' },
        ],
      },
      {
        n: '02',
        title: 'Padel Shop',
        links: [
          { href: '/store?cat=rackets', label: 'Rackets' },
          { href: '/store?cat=accessories', label: 'Accessories' },
          { href: '/store?cat=padelwear', label: 'Padelwear' },
        ],
      },
    ],
  },
  {
    key: 'pilates',
    label: 'Pilates',
    sections: [
      {
        n: '01',
        title: 'Classes',
        links: [
          { href: '/pilates/schedule', label: 'Schedule' },
          { href: '/pilates/schedule?type=reformer', label: 'Reformer' },
          { href: '/pilates/schedule?type=mat', label: 'Mat' },
          { href: '/pilates/schedule?type=private', label: 'Private' },
        ],
      },
      {
        n: '02',
        title: 'Pilates Shop',
        links: [
          { href: '/store?cat=pilates', label: 'Grip socks' },
          { href: '/store?cat=towels', label: 'Towels' },
        ],
      },
    ],
  },
  {
    key: 'shop',
    label: 'Shop',
    sections: [
      {
        n: '01',
        title: 'Padel Gear',
        links: [
          { href: '/store?cat=rackets', label: 'Rackets' },
          { href: '/store?cat=accessories', label: 'Accessories' },
        ],
      },
      {
        n: '02',
        title: 'Lifestyle',
        links: [
          { href: '/store?cat=lifestyle', label: 'Apparel' },
          { href: '/store', label: 'All products' },
        ],
      },
    ],
  },
  {
    key: 'club',
    label: 'The Club',
    sections: [
      {
        n: '01',
        title: 'Discover',
        links: [
          { href: '/coaches', label: 'Coaches & instructors' },
        ],
      },
      {
        n: '02',
        title: 'Visit',
        links: [
          { href: 'tel:+21627314100', label: '+216 27 314 100' },
        ],
      },
    ],
  },
]

interface MegaMenuProps {
  open: boolean
  onClose: () => void
}

export function MegaMenu({ open, onClose }: MegaMenuProps) {
  const [activeKey, setActiveKey] = useState('padel')
  const active = MENU.find((c) => c.key === activeKey) ?? MENU[0]!

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
      aria-hidden={!open}
      {...(!open ? { inert: '' } : {})}
      className={cn(
        'fixed inset-0 z-50 bg-navy-alt',
        open ? 'pointer-events-auto' : 'pointer-events-none invisible',
      )}
      style={open ? { animation: 'fade-in 0.2s ease' } : { display: 'none' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-[8vw] h-20 border-b border-white/8">
        <span className="font-display text-[20px] tracking-[0.14em] text-white leading-none">
          TAKE OFF
        </span>
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="text-white/50 hover:text-white transition-colors flex items-center gap-2.5 font-mono text-[11px] tracking-[0.22em]"
        >
          CLOSE <X size={18} />
        </button>
      </div>

      <div className="flex h-[calc(100vh-80px)] overflow-hidden">
        {/* Category tabs */}
        <nav className="w-48 flex-none border-r border-white/8 py-10 px-6 flex flex-col gap-1">
          {MENU.map((cat) => (
            <button
              key={cat.key}
              onMouseEnter={() => setActiveKey(cat.key)}
              onClick={() => setActiveKey(cat.key)}
              className={cn(
                'text-left px-3 py-2.5 rounded-card font-medium text-sm transition-colors',
                cat.key === activeKey
                  ? 'text-white bg-white/8'
                  : 'text-white/45 hover:text-white hover:bg-white/5',
              )}
            >
              {cat.label}
            </button>
          ))}
        </nav>

        {/* Sections */}
        <div className="flex-1 py-10 px-[5vw] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-3xl">
            {active.sections.map((section) => (
              <div key={section.n}>
                <p className="font-mono text-[10px] tracking-[0.34em] text-lime mb-4">
                  {section.n} — {section.title.toUpperCase()}
                </p>
                <ul className="flex flex-col gap-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className="text-white/65 hover:text-white text-base transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
