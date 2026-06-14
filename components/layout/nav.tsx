'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ShoppingBag, Menu } from 'lucide-react'
import { MegaMenu } from './mega-menu'
import { CartDrawer } from './cart-drawer'
import { useCartStore } from '@/lib/cart/store'
import { cn } from '@/lib/cn'

interface NavProps {
  theme?: 'dark' | 'light'
}

export function Nav({ theme = 'dark' }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const itemCount = useCartStore((s) => s.items.length)

  const isDark = theme === 'dark'

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-[8vw] h-20',
          isDark ? 'text-white' : 'text-navy',
        )}
      >
        {/* Brand */}
        <Link
          href="/"
          className={cn(
            'flex flex-col gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime rounded-sm',
          )}
        >
          <span className="font-display text-[20px] tracking-[0.14em] leading-none">
            TAKE OFF
          </span>
          <span
            className={cn(
              'font-mono text-[9px] tracking-[0.36em]',
              isDark ? 'text-white/45' : 'text-navy/40',
            )}
          >
            PADEL &middot; PILATES
          </span>
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className={cn(
              'hidden md:block font-mono text-[11px] tracking-[0.22em] transition-colors',
              isDark ? 'text-white/55 hover:text-white' : 'text-navy/50 hover:text-navy',
            )}
          >
            SIGN IN
          </Link>

          {/* Cart */}
          <button
            onClick={() => setCartOpen(true)}
            aria-label={`Cart (${itemCount} items)`}
            className={cn(
              'relative transition-colors',
              isDark ? 'text-white/70 hover:text-white' : 'text-navy/60 hover:text-navy',
            )}
          >
            <ShoppingBag size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-lime text-navy text-[9px] font-bold flex items-center justify-center leading-none">
                {itemCount}
              </span>
            )}
          </button>

          {/* Menu toggle */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className={cn(
              'flex items-center gap-2.5 font-mono text-[11px] tracking-[0.22em] transition-colors',
              isDark ? 'text-white/70 hover:text-white' : 'text-navy/60 hover:text-navy',
            )}
          >
            <Menu size={18} />
            MENU
          </button>
        </div>
      </header>

      <MegaMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
