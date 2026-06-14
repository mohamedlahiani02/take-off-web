'use client'

/**
 * Accessible modal dialog using the native HTML <dialog> element.
 * Uses showModal() / close() for focus trapping and backdrop behaviour.
 */
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  // Allow closing with Escape (native browser behaviour) or backdrop click
  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleClick}
      onClose={onClose}
      className={cn(
        'backdrop:bg-navy/60 backdrop:backdrop-blur-sm',
        'rounded-large bg-cream p-8 shadow-xl max-w-lg w-full',
        'open:animate-[fade-in_0.2s_ease]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-6">
        <h2 className="font-display text-2xl text-navy leading-none tracking-tight">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="text-navy/40 hover:text-navy transition-colors mt-1"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
