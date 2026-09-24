'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth/client'
import { useOtp } from './use-otp'

/**
 * The one padel booking journey, shared by the full calendar and the padel
 * landing page so both behave identically.
 *
 * Picking a slot opens this and nothing else: no booking row is created and no
 * wallet is touched until the member presses Confirm on the summary. Closing at
 * any earlier step leaves nothing behind.
 *
 *   slot → mode → partners (optional) → payment + summary → confirmation
 *
 * Prices are read from the server and echoed back as `quotedPriceDt`, which the
 * API compares against its own configuration; the browser never decides what a
 * booking costs.
 */

export interface SlotSelection {
  courtId: string
  courtName: string
  /** Club-local day, YYYY-MM-DD. */
  date: string
  /** Club-local start, HH:MM. */
  time: string
  /** Authoritative instant from the availability response. */
  startsAt: string
  /** True when the slot is an existing shared match with seats left. */
  shareOnly: boolean
  openShareSlots?: number
}

interface Pricing {
  fullPriceDt: number
  seatPriceDt: number
  seatsPerCourt: number
  currency: string
}

type Mode = 'FULL' | 'SHARE'
type PayMethod = 'WALLET' | 'PAY_AT_CLUB'
type Step = 'mode' | 'partners' | 'summary' | 'done'

interface Partner {
  /** Local row id, so React keys survive edits. */
  key: string
  kind: 'member' | 'guest'
  value: string
}

const newKey = () => Math.random().toString(36).slice(2)

export function BookingFlow({
  selection,
  onClose,
  onBooked,
}: {
  selection: SlotSelection | null
  onClose: () => void
  onBooked?: () => void
}) {
  const { user } = useAuth()
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [step, setStep] = useState<Step>('mode')
  const [mode, setMode] = useState<Mode>('SHARE')
  const [pay, setPay] = useState<PayMethod>('PAY_AT_CLUB')
  const [partners, setPartners] = useState<Partner[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<string>('')

  const panel = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)
  // Guards a double submit: the second press is ignored, not queued.
  const inFlight = useRef(false)

  const otp = useOtp(() => setStep('summary'))
  const open = selection !== null

  // Fresh journey whenever a new slot is picked.
  useEffect(() => {
    if (!selection) return
    restoreFocus.current = document.activeElement as HTMLElement
    setStep('mode')
    setMode(selection.shareOnly ? 'SHARE' : 'SHARE')
    setPay('PAY_AT_CLUB')
    setPartners([])
    setError('')
    setConfirmation('')
    setSubmitting(false)
    inFlight.current = false
    otp.reset()
  }, [selection]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pricing is loaded once and reused; the amount shown is the server's.
  useEffect(() => {
    if (!open || pricing) return
    let active = true
    fetch('/api/courts/pricing', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Pricing | null) => {
        if (active && p) setPricing(p)
      })
      .catch(() => {
        /* The summary refuses to submit without a price. */
      })
    return () => {
      active = false
    }
  }, [open, pricing])

  const close = useCallback(() => {
    onClose()
    restoreFocus.current?.focus()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  useEffect(() => {
    if (!open || !panel.current || panel.current.contains(document.activeElement)) return
    panel.current
      .querySelector<HTMLElement>('input:not([disabled]), button:not([disabled])')
      ?.focus()
  }, [open, step, otp.step])

  if (!open || !selection) return null

  const seats = pricing?.seatsPerCourt ?? 4
  const amount = mode === 'FULL' ? pricing?.fullPriceDt : pricing?.seatPriceDt
  // The organiser already holds one seat.
  const partnerLimit = seats - 1

  function addPartner(kind: 'member' | 'guest') {
    if (partners.length >= partnerLimit) return
    setPartners((p) => [...p, { key: newKey(), kind, value: '' }])
  }

  async function confirm() {
    if (!selection || !pricing) return
    // Two presses must not become two bookings.
    if (inFlight.current) return
    inFlight.current = true
    setSubmitting(true)
    setError('')
    try {
      const named = partners
        .map((p) => ({ kind: p.kind, value: p.value.trim() }))
        .filter((p) => p.value)
      const res = await fetch(`/api/courts/${selection.courtId}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          startsAt: selection.startsAt,
          mode,
          paymentMethod: pay,
          // Echoed for the server to check against its own configuration.
          quotedPriceDt: amount,
          participants: named.map((p) =>
            p.kind === 'member' ? { phone: p.value } : { guestName: p.value },
          ),
        }),
      })
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        // A refused booking must never look like a success.
        setError(
          (body['detail'] as string) ??
            (body['title'] as string) ??
            'Booking failed. Nothing has been charged.',
        )
        return
      }
      setConfirmation(String(body['bookingId'] ?? ''))
      setStep('done')
      onBooked?.()
    } catch {
      setError('Network error — nothing has been booked or charged.')
    } finally {
      setSubmitting(false)
      inFlight.current = false
    }
  }

  const heading =
    step === 'done'
      ? 'Booking confirmed'
      : step === 'mode'
        ? selection.shareOnly
          ? 'Join this match'
          : 'How do you want to book?'
        : step === 'partners'
          ? 'Who is playing? (optional)'
          : 'Review and confirm'

  return (
    <div
      id="pr-booking-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Book a court"
      onClick={(e) => e.target === e.currentTarget && close()}
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/80 backdrop-blur-sm sm:items-center sm:px-[max(1rem,5vw)]"
    >
      <div
        ref={panel}
        className="max-h-[92vh] w-full max-w-[30rem] overflow-y-auto rounded-t-card border border-lime/20 bg-navy p-5 sm:rounded-card sm:p-7"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[0.62rem] tracking-[0.26em] text-lime">
              {selection.courtName.toUpperCase()}
            </p>
            <p
              id="pr-booking-slot"
              className="mt-1 font-mono text-[0.72rem] tracking-[0.06em] text-white/60"
            >
              {selection.date} · {selection.time} · 90 min
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="pr-otp-close shrink-0 font-mono text-[0.68rem] tracking-[0.12em] text-white/50 hover:text-white"
          >
            ✕ close
          </button>
        </div>

        <h2 id="pr-booking-heading" className="mb-5 font-display text-[1.5rem] text-white">
          {heading}
        </h2>

        {/* ── step 1: mode ─────────────────────────────────────────────── */}
        {step === 'mode' && (
          <>
            <div className="flex flex-col gap-3">
              <ModeCard
                id="pr-mode-share"
                selected={mode === 'SHARE'}
                onSelect={() => setMode('SHARE')}
                title="Share the court"
                price={pricing ? `${pricing.seatPriceDt.toFixed(3)} DT` : '—'}
                detail={
                  selection.shareOnly
                    ? `Join this match · ${selection.openShareSlots ?? 0} place(s) left`
                    : `You pay your own place. ${seats - 1} places stay open.`
                }
              />
              {!selection.shareOnly && (
                <ModeCard
                  id="pr-mode-full"
                  selected={mode === 'FULL'}
                  onSelect={() => setMode('FULL')}
                  title="Whole court"
                  price={pricing ? `${pricing.fullPriceDt.toFixed(3)} DT` : '—'}
                  detail="You cover the court. Bring up to three players."
                />
              )}
            </div>
            <StepButton
              id="pr-booking-next"
              onClick={() => setStep('partners')}
              label="Continue →"
            />
          </>
        )}

        {/* ── step 2: optional partners ────────────────────────────────── */}
        {step === 'partners' && (
          <>
            <p className="mb-4 text-[0.85rem] leading-relaxed text-white/55">
              You can name your partners now or later — booking alone is fine. Naming someone
              reserves their place; it does not charge them.
            </p>

            <ul className="mb-4 flex flex-col gap-2">
              {partners.map((p, i) => (
                <li key={p.key} className="flex gap-2">
                  <input
                    aria-label={p.kind === 'member' ? `Partner ${i + 1} phone` : `Partner ${i + 1} name`}
                    value={p.value}
                    onChange={(e) =>
                      setPartners((prev) =>
                        prev.map((x) => (x.key === p.key ? { ...x, value: e.target.value } : x)),
                      )
                    }
                    placeholder={p.kind === 'member' ? '+216 XX XXX XXX' : 'Guest name'}
                    className="flex-1 rounded-card border border-white/12 bg-white/5 px-3 py-2.5 text-[0.85rem] text-white placeholder-white/30 focus:border-lime/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label={`Remove partner ${i + 1}`}
                    onClick={() => setPartners((prev) => prev.filter((x) => x.key !== p.key))}
                    className="shrink-0 rounded-card border border-white/12 px-3 text-white/50 hover:text-white"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            {partners.length < partnerLimit && (
              <div className="mb-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addPartner('member')}
                  className="rounded-full border border-lime/35 px-4 py-2 font-mono text-[0.65rem] tracking-[0.1em] text-lime"
                >
                  + Member by phone
                </button>
                <button
                  type="button"
                  onClick={() => addPartner('guest')}
                  className="rounded-full border border-white/20 px-4 py-2 font-mono text-[0.65rem] tracking-[0.1em] text-white/70"
                >
                  + Guest by name
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <StepButton
                id="pr-booking-next"
                // Always the summary: it renders sign-in first when needed, so
                // the chosen slot and named partners are never discarded.
                onClick={() => setStep('summary')}
                label="Continue →"
                inline
              />
              <BackButton onClick={() => setStep('mode')} />
            </div>
          </>
        )}

        {/* ── step 3: payment + summary, or sign-in first ──────────────── */}
        {step === 'summary' && !user && (
          <OtpBlock otp={otp} onBack={() => setStep('partners')} />
        )}

        {step === 'summary' && user && (
          <>
            <dl className="mb-5 flex flex-col gap-2 rounded-card bg-card-navy p-4">
              <Row label="Court" value={selection.courtName} />
              <Row label="When" value={`${selection.date} · ${selection.time}`} />
              <Row label="Booking" value={mode === 'FULL' ? 'Whole court' : 'One place'} />
              <Row
                label="Players named"
                value={String(partners.filter((p) => p.value.trim()).length + 1)}
              />
              <div className="mt-1 flex items-baseline justify-between border-t border-white/10 pt-3">
                <dt className="font-mono text-[0.65rem] tracking-[0.2em] text-white/45">
                  TO PAY
                </dt>
                <dd id="pr-booking-total" className="font-mono text-[1.05rem] text-lime">
                  {amount !== undefined ? `${amount.toFixed(3)} DT` : '—'}
                </dd>
              </div>
            </dl>

            <fieldset className="mb-5">
              <legend className="mb-2 font-mono text-[0.62rem] tracking-[0.2em] text-white/45">
                PAYMENT
              </legend>
              <div className="flex flex-col gap-2">
                <PayOption
                  id="pr-pay-club"
                  checked={pay === 'PAY_AT_CLUB'}
                  onSelect={() => setPay('PAY_AT_CLUB')}
                  label="Pay at the club"
                />
                <PayOption
                  id="pr-pay-wallet"
                  checked={pay === 'WALLET'}
                  onSelect={() => setPay('WALLET')}
                  label="Club wallet"
                />
              </div>
            </fieldset>

            {error && (
              <p id="pr-booking-error" className="mb-4 text-[0.85rem] text-red-400">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <button
                id="pr-booking-confirm"
                type="button"
                onClick={() => void confirm()}
                disabled={submitting || !pricing}
                className="w-full rounded-full bg-lime py-3.5 text-[0.85rem] font-bold text-navy disabled:opacity-40 sm:flex-1"
              >
                {submitting ? 'Confirming…' : `Confirm booking · ${amount?.toFixed(3) ?? '—'} DT`}
              </button>
              <BackButton onClick={() => setStep('partners')} />
            </div>
          </>
        )}

        {/* ── step 4: confirmation ─────────────────────────────────────── */}
        {step === 'done' && (
          <div id="pr-booking-done">
            <p className="mb-2 text-[0.95rem] text-white">
              🎾 You’re on court — see you there.
            </p>
            <p className="mb-5 text-[0.85rem] leading-relaxed text-white/60">
              {pay === 'PAY_AT_CLUB'
                ? 'Settle at reception before you play.'
                : 'Paid from your club wallet.'}
            </p>
            {confirmation && (
              <p className="mb-5 font-mono text-[0.68rem] break-all text-white/35">
                Ref {confirmation}
              </p>
            )}
            <button
              type="button"
              onClick={close}
              className="w-full rounded-full bg-lime py-3.5 text-[0.85rem] font-bold text-navy"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ModeCard({
  id,
  selected,
  onSelect,
  title,
  price,
  detail,
}: {
  id: string
  selected: boolean
  onSelect: () => void
  title: string
  price: string
  detail: string
}) {
  return (
    <button
      id={id}
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`rounded-card border p-4 text-left transition-colors ${
        selected ? 'border-lime bg-lime/10' : 'border-white/12 hover:border-white/30'
      }`}
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[0.95rem] font-bold text-white">{title}</span>
        <span className="font-mono text-[0.9rem] text-lime">{price}</span>
      </span>
      <span className="mt-1 block text-[0.78rem] leading-relaxed text-white/55">{detail}</span>
    </button>
  )
}

function PayOption({
  id,
  checked,
  onSelect,
  label,
}: {
  id: string
  checked: boolean
  onSelect: () => void
  label: string
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
      <input
        id={id}
        type="radio"
        name="pr-pay"
        checked={checked}
        onChange={onSelect}
        className="accent-lime"
      />
      <span className="text-[0.88rem] text-white/85">{label}</span>
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-mono text-[0.62rem] tracking-[0.18em] text-white/40">{label}</dt>
      <dd className="text-right text-[0.85rem] text-white/85">{value}</dd>
    </div>
  )
}

function StepButton({
  id,
  onClick,
  label,
  inline,
}: {
  id: string
  onClick: () => void
  label: string
  inline?: boolean
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={`rounded-full bg-lime py-3.5 text-[0.85rem] font-bold text-navy ${
        inline ? 'w-full sm:flex-1' : 'mt-5 w-full'
      }`}
    >
      {label}
    </button>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-full border border-white/20 py-3.5 text-[0.85rem] text-white/75 sm:w-auto sm:px-6"
    >
      ← Back
    </button>
  )
}

/** Sign-in inside the journey, keeping the chosen slot and partners. */
function OtpBlock({
  otp,
  onBack,
}: {
  otp: ReturnType<typeof useOtp>
  onBack: () => void
}) {
  const field =
    'mb-4 w-full rounded-card border border-white/12 bg-white/5 px-4 py-3 text-[0.9rem] text-white placeholder-white/30 focus:border-lime/50 focus:outline-none'
  return (
    <>
      <p className="mb-4 text-[0.85rem] leading-relaxed text-white/55">
        Sign in to confirm. Your slot and players are kept.
      </p>
      <p
        id="pr-otp-err"
        className="mb-3 text-[0.82rem] text-red-400"
        style={{ display: otp.error ? 'block' : 'none' }}
      >
        {otp.error}
      </p>

      <div id="pr-otp-step1" style={{ display: otp.step === 'phone' ? 'block' : 'none' }}>
        <label htmlFor="pr-otp-phone" className="mb-1 block font-mono text-[0.62rem] tracking-[0.2em] text-white/45">
          PHONE
        </label>
        <input
          id="pr-otp-phone"
          type="tel"
          autoComplete="tel"
          value={otp.phone}
          onChange={(e) => otp.setPhone(e.target.value)}
          placeholder="+216 XX XXX XXX"
          className={field}
        />
        <button
          type="button"
          onClick={() => void otp.sendCode()}
          disabled={otp.busy}
          className="w-full rounded-full bg-lime py-3.5 text-[0.85rem] font-bold text-navy disabled:opacity-40"
        >
          {otp.busy ? 'Sending…' : 'Send code →'}
        </button>
      </div>

      <div id="pr-otp-step-name" style={{ display: otp.step === 'name' ? 'block' : 'none' }}>
        <label htmlFor="pr-otp-name" className="mb-1 block font-mono text-[0.62rem] tracking-[0.2em] text-white/45">
          YOUR NAME
        </label>
        <input
          id="pr-otp-name"
          type="text"
          autoComplete="given-name"
          value={otp.name}
          onChange={(e) => otp.setName(e.target.value)}
          placeholder="First name"
          className={field}
        />
        <button
          type="button"
          onClick={otp.nextFromName}
          className="w-full rounded-full bg-lime py-3.5 text-[0.85rem] font-bold text-navy"
        >
          Continue →
        </button>
      </div>

      <div id="pr-otp-step2" style={{ display: otp.step === 'code' ? 'block' : 'none' }}>
        <label htmlFor="pr-otp-code" className="mb-1 block font-mono text-[0.62rem] tracking-[0.2em] text-white/45">
          VERIFICATION CODE
        </label>
        <input
          id="pr-otp-code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          value={otp.code}
          onChange={(e) => otp.setCode(e.target.value)}
          placeholder="6-digit code"
          className={field}
        />
        <button
          type="button"
          onClick={() => void otp.verify()}
          disabled={otp.busy}
          className="w-full rounded-full bg-lime py-3.5 text-[0.85rem] font-bold text-navy disabled:opacity-40"
        >
          {otp.busy ? 'Verifying…' : 'Verify →'}
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-3 w-full rounded-full border border-white/20 py-3.5 text-[0.85rem] text-white/75"
      >
        ← Back
      </button>
    </>
  )
}
