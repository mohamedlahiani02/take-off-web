'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Nav } from '@/components/layout/nav'
import { useCartStore } from '@/lib/cart/store'
import { useAuth } from '@/lib/auth/client'

type PayMethod = 'WALLET' | 'COD' | 'CARD'
type DelivMethod = 'PICKUP' | 'DELIVER'

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { items, clear, getTotal } = useCartStore()
  const [pay, setPay] = useState<PayMethod>('COD')
  const [delivery, setDelivery] = useState<DelivMethod>('PICKUP')
  const [city, setCity] = useState('Sfax')
  const [address, setAddress] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login')
  }, [isLoading, user, router])

  useEffect(() => {
    if (user) {
      setName(user.name ?? '')
      setPhone(user.phone ?? '')
    }
  }, [user])

  if (isLoading) return null

  const totalDt = getTotal() / 1000
  const hasPhysical = items.some(i => i.kind === 'product')
  const timbre = hasPhysical && totalDt >= 10 ? 1 : 0
  const shipping = delivery === 'DELIVER' ? (city.trim().toLowerCase() === 'sfax' || !city.trim() ? 7 : 15) : 0
  const grandTotal = totalDt + timbre + shipping

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) { setError('Your cart is empty.'); return }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        deliveryMethod: delivery,
        deliveryAddress: delivery === 'DELIVER' ? { city, addr: address } : null,
        paymentMethod: pay,
        contact: { name, phone, email: '' },
        discountCode: null,
        items: items.map(it => ({
          productId: it.id.includes('|') ? null : it.id,
          productName: it.name,
          qty: it.quantity,
          size: it.variant ?? null,
          unitPriceDt: it.priceTND / 1000,
        })),
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body as Record<string, unknown>).title as string || 'Could not place order. Please try again.')
        return
      }
      const order = await res.json() as Record<string, unknown>

      if (pay === 'CARD') {
        const orderId = String(order.id ?? '')
        const intentRes = await fetch('/api/payments/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            refType: 'ORDER',
            refId: orderId,
            // The server recomputes the amount from the order; this is advisory only.
            amountDt: grandTotal,
            returnUrl: `${window.location.origin}/checkout/confirm`,
          }),
        })
        if (!intentRes.ok) {
          const errBody = await intentRes.json().catch(() => ({}))
          setError(
            (errBody as Record<string, unknown>).detail as string ||
            (errBody as Record<string, unknown>).title as string ||
            'Could not start the card payment. Your order is saved — please try again from your orders.',
          )
          return
        }
        const intent = await intentRes.json() as Record<string, unknown>
        const payUrl = String(intent.paymentUrl ?? intent.payUrl ?? '')
        if (!payUrl) {
          // Initiation reported success without anywhere to pay. Never fall through to the
          // generic confirmation — that would claim a settlement that never happened.
          setError('The payment provider did not return a payment link. Your order is saved — please retry from your orders.')
          return
        }
        // The cart is deliberately NOT cleared here: until the bank confirms, it is the
        // member's only record of what they were buying. /checkout/confirm clears it once
        // the intent is authoritatively PAID.
        window.location.href = payUrl
        return
      }

      clear()
      setConfirmation(String(order.orderRef ?? order.id ?? 'Order placed'))
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmation) {
    return (
      <>
        <Nav theme="dark" />
        <main className="min-h-screen bg-navy pt-32 pb-24 px-[8vw] flex items-center">
          <div className="max-w-md">
            <p className="font-mono text-[13px] tracking-[0.34em] text-lime uppercase mb-4">Confirmed</p>
            <h1 className="font-display text-[clamp(48px,7vw,110px)] leading-none text-white tracking-tight mb-6">
              ORDER<br />PLACED
            </h1>
            <p className="text-white/50 mb-2">Your order reference:</p>
            <p className="font-mono text-lime text-xl mb-8">{confirmation}</p>
            <button
              onClick={() => router.push('/account/orders')}
              className="px-6 py-3 rounded-full bg-lime text-navy font-bold text-sm"
            >
              View my orders →
            </button>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Nav theme="dark" />
      <main className="min-h-screen bg-navy pt-32 pb-24 px-[8vw]">
        <p className="font-mono text-[13px] tracking-[0.34em] text-lime uppercase mb-4">Checkout</p>
        <h1 className="font-display text-[clamp(48px,7vw,110px)] leading-none text-white tracking-tight mb-10">
          CHECKOUT
        </h1>

        <div className="flex flex-col lg:flex-row gap-12 max-w-4xl">
          <form onSubmit={submit} className="flex-1 flex flex-col gap-8">
            {/* Contact */}
            <section>
              <p className="font-mono text-[10px] tracking-[0.34em] text-white/30 mb-4">01 — CONTACT</p>
              <div className="flex flex-col gap-3">
                <input
                  required
                  placeholder="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-card px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-lime/50"
                />
                <input
                  required
                  placeholder="Phone"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-card px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-lime/50"
                />
              </div>
            </section>

            {/* Delivery */}
            <section>
              <p className="font-mono text-[10px] tracking-[0.34em] text-white/30 mb-4">02 — DELIVERY</p>
              <div className="flex gap-3 mb-4">
                {(['PICKUP', 'DELIVER'] as DelivMethod[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDelivery(m)}
                    className={`flex-1 py-3 rounded-card text-sm font-medium transition-colors ${
                      delivery === m ? 'bg-lime text-navy' : 'bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    {m === 'PICKUP' ? 'Pickup at club' : 'Home delivery'}
                  </button>
                ))}
              </div>
              {delivery === 'DELIVER' && (
                <div className="flex flex-col gap-3">
                  <input
                    required
                    placeholder="Address"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-card px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-lime/50"
                  />
                  <input
                    placeholder="City (default: Sfax)"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-card px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-lime/50"
                  />
                </div>
              )}
            </section>

            {/* Payment */}
            <section>
              <p className="font-mono text-[10px] tracking-[0.34em] text-white/30 mb-4">03 — PAYMENT</p>
              <div className="flex flex-col gap-2">
                {([
                  { v: 'COD', label: 'Pay at club' },
                  { v: 'WALLET', label: 'Club wallet' },
                  { v: 'CARD', label: 'Card (Konnect)' },
                ] as { v: PayMethod; label: string }[]).map(opt => (
                  <label key={opt.v} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="pay"
                      value={opt.v}
                      checked={pay === opt.v}
                      onChange={() => setPay(opt.v)}
                      className="accent-lime"
                    />
                    <span className="text-white/80 text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </section>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="w-full py-4 rounded-full bg-lime text-navy font-bold text-sm disabled:opacity-40"
            >
              {submitting ? 'Placing order…' : `Place order · ${grandTotal.toFixed(3)} DT`}
            </button>
          </form>

          {/* Order summary */}
          <aside className="lg:w-72 flex-none">
            <p className="font-mono text-[10px] tracking-[0.34em] text-white/30 mb-4">ORDER SUMMARY</p>
            <div className="flex flex-col gap-3">
              {items.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">{it.name}{it.variant ? ` (${it.variant})` : ''} ×{it.quantity}</span>
                  <span className="text-white font-mono">{(it.priceTND / 1000 * it.quantity).toFixed(3)} DT</span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-3 mt-2 flex flex-col gap-1.5 text-sm">
                {shipping > 0 && (
                  <div className="flex justify-between text-white/50">
                    <span>Delivery</span><span>{shipping.toFixed(3)} DT</span>
                  </div>
                )}
                {timbre > 0 && (
                  <div className="flex justify-between text-white/50">
                    <span>Timbre fiscal</span><span>1.000 DT</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-bold">
                  <span>Total</span><span className="font-mono">{grandTotal.toFixed(3)} DT</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  )
}
