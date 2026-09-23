'use client'

import Link from 'next/link'
import { Sheet } from '@/components/primitives/sheet'
import { Button } from '@/components/primitives/button'
import { useCartStore, lineKey } from '@/lib/cart/store'
import { formatTND } from '@/lib/format/money'
import { Trash2 } from 'lucide-react'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, remove, clear, getTotal } = useCartStore()

  return (
    <Sheet open={open} onClose={onClose} title="Cart">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 px-7 text-center">
          <p className="font-mono text-[11px] tracking-[0.26em] text-white/30 mb-3">EMPTY</p>
          <p className="text-white/50 text-sm">Your cart is empty. Start shopping.</p>
          <Link
            href="/store"
            onClick={onClose}
            className="mt-6 font-mono text-[11px] tracking-[0.22em] text-lime hover:text-lime/80 transition-colors"
          >
            VISIT THE STORE
          </Link>
        </div>
      ) : (
        <>
          {/* Items */}
          <ul className="flex flex-col divide-y divide-white/8 px-7">
            {items.map((item) => (
              <li key={lineKey(item)} className="flex items-start justify-between gap-4 py-5">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.name}</p>
                  {item.variant && (
                    <p className="text-white/40 text-xs mt-0.5">{item.variant}</p>
                  )}
                  <p className="text-lime text-sm mt-1">{formatTND(item.priceTND)}</p>
                </div>
                <button
                  onClick={() => remove(item.id, item.variant)}
                  aria-label={item.variant ? `Remove ${item.name} (${item.variant})` : `Remove ${item.name}`}
                  className="text-white/30 hover:text-white/70 transition-colors mt-0.5"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="px-7 py-6 border-t border-white/8 mt-auto">
            <div className="flex items-center justify-between mb-5">
              <span className="font-mono text-[11px] tracking-[0.22em] text-white/50">TOTAL</span>
              <span className="font-semibold text-white">{formatTND(getTotal())}</span>
            </div>
            <Link href="/checkout" onClick={onClose}>
              <Button variant="primary" size="lg" className="w-full">
                Checkout
              </Button>
            </Link>
            <button
              onClick={clear}
              className="mt-4 w-full text-center font-mono text-[10px] tracking-[0.22em] text-white/25 hover:text-white/50 transition-colors"
            >
              CLEAR CART
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
