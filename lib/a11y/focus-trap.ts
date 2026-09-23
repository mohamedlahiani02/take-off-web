'use client'

import { useEffect, type RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  )
}

/**
 * Keeps keyboard focus inside an open modal overlay and hands it back when the overlay closes.
 *
 * `inert` already removes a *closed* overlay's controls from the tab order, but says nothing
 * about an open one: tabbing backwards off the first control escaped into the page behind the
 * dialog, which for a modal means the user is operating content they cannot see.
 *
 * Wrapping is done manually rather than relying on the browser's natural order, so Tab from the
 * last control returns to the first and Shift+Tab from the first jumps to the last.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  open: boolean,
): void {
  useEffect(() => {
    if (!open) return
    const container = containerRef.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    // Move focus into the dialog so the trap has somewhere to start.
    const initial = focusableWithin(container)[0]
    initial?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = focusableWithin(container)
      if (items.length === 0) {
        // Nothing focusable inside: keep focus on the dialog rather than letting it escape.
        e.preventDefault()
        return
      }
      const first = items[0]!
      const last = items[items.length - 1]!
      const active = document.activeElement as HTMLElement | null

      if (e.shiftKey && (active === first || !container.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !container.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Return focus to whatever opened the overlay.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [containerRef, open])
}
