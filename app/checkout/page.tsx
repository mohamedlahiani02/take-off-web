import type { Metadata } from 'next'
import { Nav } from '@/components/layout/nav'

export const metadata: Metadata = {
  title: 'Checkout',
}

export default function CheckoutPage() {
  return (
    <>
      <Nav theme="dark" />
      <main className="min-h-screen bg-navy pt-32 pb-24 px-[8vw]">
        <p className="font-mono text-[13px] tracking-[0.34em] text-lime uppercase mb-4">
          Checkout
        </p>
        <h1 className="font-display text-[clamp(56px,9vw,140px)] leading-[0.9] text-white tracking-tight">
          CHECKOUT
        </h1>
        <p className="mt-6 text-white/55 max-w-md text-lg">
          01 — Multi-step checkout (contact, delivery, payment) coming soon.
        </p>
      </main>
    </>
  )
}
