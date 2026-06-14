'use client'

/**
 * Sheet — a slide-over panel that appears from the right edge of the viewport.
 * Used for the cart drawer and other contextual panels.
 */
import { useEffect } from 'react'
import { cn } from '@/lib/cn'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  // Lock body scroll while the sheet is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-navy/50 backdrop-blur-sm"
          style={{ animation: 'fade-in 0.2s ease' }}
        />
      )}

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-full max-w-md bg-navy flex flex-col shadow-2xl',
          'transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-6 border-b border-white/8">
          <h2 className="font-display text-2xl text-white tracking-tight leading-none">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </>
  )
}
