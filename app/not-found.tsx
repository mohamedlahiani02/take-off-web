import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '404 — Not Found',
}

export default function NotFound() {
  return (
    <main className="min-h-screen bg-navy flex flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-[13px] tracking-[0.34em] text-lime mb-4">404 — NOT FOUND</p>
      <h1 className="font-display text-[clamp(64px,10vw,160px)] leading-none tracking-tight text-white">
        OUT OF BOUNDS
      </h1>
      <p className="mt-6 text-white/60 text-lg max-w-sm">
        This page doesn&apos;t exist. Head back to the club.
      </p>
      <Link
        href="/"
        className="mt-10 inline-flex items-center gap-3 px-7 py-4 rounded-pill bg-lime text-navy font-semibold transition-transform hover:-translate-y-1"
      >
        Back to the gateway
      </Link>
    </main>
  )
}
