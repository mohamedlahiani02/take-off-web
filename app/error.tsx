'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Capture unexpected errors to Sentry for ops alerting.
    // The DSN guard in lib/sentry/init.ts means this is a no-op in local dev
    // unless NEXT_PUBLIC_SENTRY_DSN is set.
    Sentry.captureException(error)
  }, [error])

  return (
    <main className="min-h-screen bg-navy flex flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-[13px] tracking-[0.34em] text-lime mb-4">
        UNEXPECTED ERROR
      </p>
      <h1 className="font-display text-[clamp(48px,8vw,120px)] leading-none tracking-tight text-white">
        SOMETHING WENT WRONG
      </h1>
      <p className="mt-6 text-white/60 text-lg max-w-md">
        Our team has been notified. Please try again or call us on{' '}
        <a href="tel:+21627314100" className="text-lime underline-offset-4 hover:underline">
          +216 27 314 100
        </a>
        .
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[11px] tracking-widest text-white/30">
          ref: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="mt-10 inline-flex items-center gap-3 px-7 py-4 rounded-pill bg-lime text-navy font-semibold transition-transform hover:-translate-y-1"
      >
        Try again
      </button>
    </main>
  )
}
