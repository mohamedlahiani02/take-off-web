'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import { useFocusTrap } from '@/lib/a11y/focus-trap'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Contains Tab/Shift+Tab while open and restores focus to the opener on close.
  useFocusTrap(panelRef, open)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-navy/50 backdrop-blur-sm"
          style={{ animation: 'fade-in 0.2s ease' }}
        />
      )}

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
        inert={!open || undefined}
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-full max-w-md bg-navy flex flex-col shadow-2xl',
          'transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
          className,
        )}
      >
        <div className="flex items-center justify-between px-7 py-6 border-b border-white/8">
          <h2 className="font-display text-2xl text-white tracking-tight leading-none">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            disabled={!open}
            tabIndex={open ? undefined : -1}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </>
  )
}
