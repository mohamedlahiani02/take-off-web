'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Nav } from '@/components/layout/nav'
import { useCartStore } from '@/lib/cart/store'

type Settlement = 'loading' | 'pending' | 'paid' | 'failed' | 'unknown' | 'unauthenticated'

interface IntentStatus {
  status?: string
  refType?: string
  refId?: string
  amountDt?: number | string
}

/** How long to keep polling a PENDING intent before asking the member to check back. */
const POLL_INTERVAL_MS = 2500
const MAX_POLLS = 8

function mapStatus(raw: string | undefined): Settlement {
  switch ((raw ?? '').toUpperCase()) {
    case 'PAID':
      return 'paid'
    case 'PENDING':
      return 'pending'
    case 'FAILED':
      return 'failed'
    default:
      return 'unknown'
  }
}

function ConfirmBody() {
  const router = useRouter()
  const params = useSearchParams()
  const intentId = params.get('intentId')

  const [settlement, setSettlement] = useState<Settlement>('loading')
  const [intent, setIntent] = useState<IntentStatus | null>(null)
  const pollsRef = useRef(0)
  const clearCart = useCartStore((s) => s.clear)

  // The cart survives initiation and redirect on purpose; it is the member's recovery record
  // while a payment is pending or failed. Only an authoritative PAID clears it.
  useEffect(() => {
    if (settlement === 'paid') clearCart()
  }, [settlement, clearCart])

  const check = useCallback(async (): Promise<Settlement> => {
    if (!intentId) return 'unknown'
    try {
      const res = await fetch(`/api/payments/${encodeURIComponent(intentId)}/status`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.status === 401) return 'unauthenticated'
      if (!res.ok) return 'unknown'
      const data = (await res.json()) as IntentStatus
      setIntent(data)
      return mapStatus(data.status)
    } catch {
      return 'unknown'
    }
  }, [intentId])

  useEffect(() => {
    if (!intentId) {
      setSettlement('unknown')
      return
    }
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined

    const run = async () => {
      const next = await check()
      if (!active) return
      setSettlement(next)
      // Only a PENDING intent is worth re-reading; every other state is final for this visit.
      if (next === 'pending' && pollsRef.current < MAX_POLLS) {
        pollsRef.current += 1
        timer = setTimeout(run, POLL_INTERVAL_MS)
      }
    }
    void run()

    return () => {
      active = false
      if (timer) clearTimeout(timer)
    }
  }, [intentId, check])

  const retry = async () => {
    pollsRef.current = 0
    setSettlement('loading')
    const next = await check()
    setSettlement(next)
  }

  const heading: Record<Settlement, string> = {
    loading: 'CHECKING\nPAYMENT',
    pending: 'PAYMENT\nPENDING',
    paid: 'PAYMENT\nCONFIRMED',
    failed: 'PAYMENT\nFAILED',
    unknown: 'PAYMENT\nUNVERIFIED',
    unauthenticated: 'SIGN IN\nTO CONTINUE',
  }

  const eyebrow: Record<Settlement, string> = {
    loading: 'Checking',
    pending: 'Pending',
    paid: 'Settled',
    failed: 'Failed',
    unknown: 'Unverified',
    unauthenticated: 'Session expired',
  }

  const blurb: Record<Settlement, string> = {
    loading: 'Confirming your payment with the bank…',
    pending:
      'Your bank has not confirmed this payment yet. Nothing further is needed from you — this page updates itself, and your order stays reserved.',
    paid: 'Your payment has been confirmed and your order is now being prepared.',
    failed:
      'The payment did not go through and you have not been charged. Your order is still saved, so you can try paying again.',
    unknown:
      'We could not verify this payment right now. Your order is saved — please check your orders in a moment before paying again.',
    unauthenticated: 'Please sign in again to see the status of this payment.',
  }

  return (
    <>
      <Nav theme="dark" />
      <main className="min-h-screen bg-navy pt-32 pb-24 px-[8vw] flex items-center">
        <div className="max-w-lg">
          <p className="font-mono text-[13px] tracking-[0.34em] text-lime uppercase mb-4">
            {eyebrow[settlement]}
          </p>
          <h1 className="font-display text-[clamp(44px,7vw,110px)] leading-none text-white tracking-tight mb-6 whitespace-pre-line">
            {heading[settlement]}
          </h1>
          <p className="text-white/60 mb-8">{blurb[settlement]}</p>

          {intentId && (
            <div className="rounded-card bg-card-navy p-5 mb-8 flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/40 font-mono text-xs tracking-[0.2em]">REFERENCE</span>
                <span className="text-white font-mono text-xs break-all">{intentId}</span>
              </div>
              {intent?.amountDt !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/40 font-mono text-xs tracking-[0.2em]">AMOUNT</span>
                  <span className="text-lime font-mono text-xs">{String(intent.amountDt)} DT</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {(settlement === 'pending' || settlement === 'unknown' || settlement === 'failed') && (
              <button
                onClick={retry}
                className="px-6 py-3 rounded-full bg-lime text-navy font-bold text-sm"
              >
                Check again
              </button>
            )}
            {settlement === 'failed' && (
              <button
                onClick={() => router.push('/checkout')}
                className="px-6 py-3 rounded-full border border-white/20 text-white font-bold text-sm"
              >
                Try paying again
              </button>
            )}
            {settlement === 'unauthenticated' ? (
              <Link
                href="/login"
                className="px-6 py-3 rounded-full bg-lime text-navy font-bold text-sm"
              >
                Sign in
              </Link>
            ) : (
              <Link
                href="/account/orders"
                className="px-6 py-3 rounded-full border border-white/20 text-white font-bold text-sm"
              >
                View my orders →
              </Link>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

export default function CheckoutConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmBody />
    </Suspense>
  )
}
