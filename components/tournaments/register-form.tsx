'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth/client'
import { InlineSignIn } from '@/components/auth/inline-signin'
import type { PublicTournament } from '@/lib/api/public'

interface FieldDto {
  id: string
  fieldType:
    | 'SHORT_TEXT'
    | 'LONG_TEXT'
    | 'DROPDOWN'
    | 'MULTI_SELECT'
    | 'DATE'
    | 'PARTNER'
    | 'FILE'
    | 'TSHIRT_SIZE'
    | 'PHONE'
    | 'AGREEMENT'
  label: string
  helpText: string | null
  required: boolean
  options: Record<string, unknown> | null
  displayOrder: number
}

interface PricingTier {
  id: string
  label: string
  priceDt: number
  displayOrder: number
}

type PaymentMethod = 'WALLET' | 'AT_CLUB'
type Step = 'form' | 'recap' | 'signin' | 'done'

interface DoneResult {
  status: 'CONFIRMED' | 'PENDING' | 'WAITLIST'
  paymentStatus: string
  amountPaidDt: number
}

/**
 * The registration journey: fields -> recap (explicit price, CGU) ->
 * confirm -> honest result. Nothing is submitted until the member presses
 * confirm on the recap screen — filling the form charges and reserves
 * nothing by itself, mirroring the padel booking flow's own rule.
 */
export function TournamentRegisterForm({ tournament }: { tournament: PublicTournament }) {
  const { user, isLoading: authLoading } = useAuth()
  const [step, setStep] = useState<Step>('form')
  const [fields, setFields] = useState<FieldDto[] | null>(null)
  const [pricing, setPricing] = useState<PricingTier[] | null>(null)
  const [loadError, setLoadError] = useState('')

  const [categoryLabel, setCategoryLabel] = useState('')
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({})
  const [pricingId, setPricingId] = useState<string | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<DoneResult | null>(null)
  const inFlight = useRef(false)

  useEffect(() => {
    let active = true
    Promise.all([
      fetch(`/api/tournaments/${tournament.id}/fields`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/tournaments/${tournament.id}/pricing`, { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([f, p]) => {
        if (!active) return
        setFields(Array.isArray(f) ? f : [])
        setPricing(Array.isArray(p) ? p : [])
      })
      .catch(() => {
        if (active) setLoadError('Impossible de charger le formulaire. Réessayez.')
      })
    return () => {
      active = false
    }
  }, [tournament.id])

  const rule = tournament.paymentRule ?? 'BOTH'
  useEffect(() => {
    if (paymentMethod) return
    if (rule === 'ONLINE') setPaymentMethod('WALLET')
    else if (rule === 'AT_CLUB') setPaymentMethod('AT_CLUB')
  }, [rule, paymentMethod])

  const price = useMemo(() => {
    if (pricingId && pricing) {
      const t = pricing.find((p) => p.id === pricingId)
      if (t) return t.priceDt
    }
    return tournament.entryFeeDt ?? 0
  }, [pricingId, pricing, tournament.entryFeeDt])

  const missingRequired = useMemo(() => {
    if (!fields) return []
    return fields.filter((f) => {
      if (!f.required) return false
      const v = answers[f.id]
      if (f.fieldType === 'AGREEMENT') return v !== true
      return !v || (typeof v === 'string' && v.trim() === '')
    })
  }, [fields, answers])

  const goToRecap = useCallback(() => {
    setError('')
    if (missingRequired.length > 0) {
      setError(`Merci de compléter : ${missingRequired.map((f) => f.label).join(', ')}`)
      return
    }
    setStep('recap')
  }, [missingRequired])

  const submit = useCallback(async () => {
    if (inFlight.current) return
    if (!user) {
      setStep('signin')
      return
    }
    if (!paymentMethod) {
      setError('Choisissez un moyen de paiement.')
      return
    }
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryLabel: categoryLabel.trim() || null,
          answers,
          pricingId,
          promoCode: promoCode.trim() || null,
          paymentMethod,
          quotedPriceDt: price,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        setError((data['detail'] as string) ?? (data['title'] as string) ?? "L'inscription a été refusée.")
        return
      }
      setResult({
        status: data['status'] as DoneResult['status'],
        paymentStatus: data['paymentStatus'] as string,
        amountPaidDt: Number(data['amountPaidDt'] ?? 0),
      })
      setStep('done')
    } catch {
      setError('Erreur réseau — rien n’a été soumis.')
    } finally {
      setBusy(false)
      inFlight.current = false
    }
  }, [user, paymentMethod, tournament.id, categoryLabel, answers, pricingId, promoCode, price])

  if (loadError) {
    return <p className="rounded-[0.5rem] bg-white/5 px-4 py-3 text-[0.8rem] text-white/60">{loadError}</p>
  }
  if (!fields || !pricing) {
    return <div className="h-32 animate-pulse rounded-[0.5rem] bg-white/5" />
  }

  if (step === 'done' && result) {
    const label =
      result.status === 'CONFIRMED'
        ? 'INSCRIPTION CONFIRMÉE'
        : result.status === 'PENDING'
          ? 'INSCRIPTION EN ATTENTE DE VALIDATION'
          : 'AJOUTÉ·E À LA LISTE D’ATTENTE'
    const payLabel =
      result.paymentStatus === 'PAID'
        ? `${result.amountPaidDt.toFixed(3)} DT payés`
        : result.paymentStatus === 'PAY_AT_CLUB'
          ? 'À régler au club'
          : 'Rien n’a été débité'
    return (
      <div id="tr-done" className="rounded-card bg-card-navy p-5 sm:p-6">
        <p className="font-mono text-[0.75rem] tracking-[0.14em] text-lime">{label}</p>
        <p className="mt-2 text-[0.85rem] text-white/70">{payLabel}</p>
        {result.status === 'PENDING' && (
          <p className="mt-3 text-[0.78rem] leading-relaxed text-white/50">
            Le club valide chaque inscription avant de la confirmer — votre place n’est pas encore garantie.
          </p>
        )}
        {result.status === 'WAITLIST' && (
          <p className="mt-3 text-[0.78rem] leading-relaxed text-white/50">
            Le tournoi est complet. Vous serez averti·e si une place se libère — rien ne vous a été débité.
          </p>
        )}
      </div>
    )
  }

  if (step === 'signin') {
    return <InlineSignIn onVerified={() => setStep('recap')} onBack={() => setStep('recap')} />
  }

  if (step === 'recap') {
    return (
      <div id="tr-recap" className="rounded-card bg-card-navy p-5 sm:p-6">
        <p className="font-mono text-[0.65rem] tracking-[0.22em] text-white/40 uppercase">Récapitulatif</p>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-[0.85rem] text-white/70">Montant</span>
          <span id="tr-price" className="font-display text-[1.6rem] text-lime">
            {price.toFixed(3)} DT
          </span>
        </div>
        {tournament.registrationMode === 'MEMBERS_ONLY' && (
          <p className="mt-2 text-[0.72rem] text-white/40">Réservé aux membres.</p>
        )}

        <div className="mt-4">
          <label className="mb-1 block font-mono text-[0.62rem] tracking-[0.1em] text-white/40 uppercase" htmlFor="tr-promo">
            Code promo (optionnel)
          </label>
          <input
            id="tr-promo"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            className="w-full rounded-[0.4rem] border border-white/15 bg-transparent px-3 py-2 text-[0.85rem] text-white outline-none focus:border-lime"
          />
        </div>

        {(rule === 'BOTH' || rule === 'ONLINE') && (
          <button
            type="button"
            data-payment="WALLET"
            onClick={() => setPaymentMethod('WALLET')}
            className={`mt-3 block w-full rounded-[0.5rem] border px-4 py-3 text-left text-[0.85rem] ${paymentMethod === 'WALLET' ? 'border-lime text-lime' : 'border-white/15 text-white/70'}`}
          >
            Payer avec mon wallet
          </button>
        )}
        {(rule === 'BOTH' || rule === 'AT_CLUB') && (
          <button
            type="button"
            data-payment="AT_CLUB"
            onClick={() => setPaymentMethod('AT_CLUB')}
            className={`mt-2 block w-full rounded-[0.5rem] border px-4 py-3 text-left text-[0.85rem] ${paymentMethod === 'AT_CLUB' ? 'border-lime text-lime' : 'border-white/15 text-white/70'}`}
          >
            Régler au club
          </button>
        )}

        {error && <p id="tr-error" className="mt-3 text-[0.78rem] text-red-400">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => setStep('form')}
            className="rounded-full border border-white/20 px-4 py-3 font-mono text-[0.65rem] tracking-[0.1em] text-white/60"
          >
            RETOUR
          </button>
          <button
            type="button"
            id="tr-confirm"
            disabled={busy || !paymentMethod}
            onClick={() => void submit()}
            className="flex-1 rounded-full bg-lime py-3 text-center text-[0.85rem] font-bold text-navy disabled:opacity-40"
          >
            {busy ? '…' : authLoading ? '…' : user ? 'Confirmer l’inscription' : 'Se connecter et confirmer'}
          </button>
        </div>
      </div>
    )
  }

  // step === 'form'
  return (
    <div id="tr-form" className="rounded-card bg-card-navy p-5 sm:p-6">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-white/40 uppercase">Formulaire d’inscription</p>

      <div className="mt-3">
        <label className="mb-1 block font-mono text-[0.62rem] tracking-[0.1em] text-white/40 uppercase" htmlFor="tr-category">
          Catégorie / Tableau
        </label>
        <input
          id="tr-category"
          value={categoryLabel}
          onChange={(e) => setCategoryLabel(e.target.value)}
          placeholder={tournament.category ?? ''}
          className="w-full rounded-[0.4rem] border border-white/15 bg-transparent px-3 py-2 text-[0.85rem] text-white outline-none focus:border-lime"
        />
      </div>

      {pricing.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 font-mono text-[0.62rem] tracking-[0.1em] text-white/40 uppercase">Formule</p>
          {pricing
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPricingId(t.id)}
                className={`mb-2 block w-full rounded-[0.4rem] border px-3 py-2 text-left text-[0.82rem] ${pricingId === t.id ? 'border-lime text-lime' : 'border-white/15 text-white/70'}`}
              >
                {t.label} — {t.priceDt.toFixed(3)} DT
              </button>
            ))}
        </div>
      )}

      {fields
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((f) => (
          <TournamentField
            key={f.id}
            field={f}
            value={answers[f.id]}
            onChange={(v) => setAnswers((prev) => ({ ...prev, [f.id]: v }))}
          />
        ))}

      {error && <p className="mt-3 text-[0.78rem] text-red-400">{error}</p>}

      <button
        type="button"
        id="tr-next"
        onClick={goToRecap}
        className="mt-5 block w-full rounded-full bg-lime py-3 text-center text-[0.85rem] font-bold text-navy"
      >
        Continuer
      </button>
    </div>
  )
}

function TournamentField({
  field,
  value,
  onChange,
}: {
  field: FieldDto
  value: string | boolean | undefined
  onChange: (v: string | boolean) => void
}) {
  const options = (field.options?.['choices'] as string[] | undefined) ?? []
  const star = field.required ? ' *' : ''

  if (field.fieldType === 'AGREEMENT') {
    return (
      <label className="mt-4 flex items-start gap-2 text-[0.8rem] text-white/70">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1"
        />
        <span>
          {field.label}
          {star}
        </span>
      </label>
    )
  }

  if (field.fieldType === 'DROPDOWN' || field.fieldType === 'TSHIRT_SIZE') {
    const choices = options.length > 0 ? options : field.fieldType === 'TSHIRT_SIZE' ? ['XS', 'S', 'M', 'L', 'XL', 'XXL'] : []
    return (
      <div className="mt-4">
        <label className="mb-1 block font-mono text-[0.62rem] tracking-[0.1em] text-white/40 uppercase">
          {field.label}
          {star}
        </label>
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-[0.4rem] border border-white/15 bg-navy px-3 py-2 text-[0.85rem] text-white outline-none focus:border-lime"
        >
          <option value="">—</option>
          {choices.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {field.helpText && <p className="mt-1 text-[0.68rem] text-white/40">{field.helpText}</p>}
      </div>
    )
  }

  const isLong = field.fieldType === 'LONG_TEXT'
  const isPartner = field.fieldType === 'PARTNER'
  const inputType = field.fieldType === 'DATE' ? 'date' : field.fieldType === 'PHONE' ? 'tel' : 'text'

  return (
    <div className="mt-4">
      <label className="mb-1 block font-mono text-[0.62rem] tracking-[0.1em] text-white/40 uppercase">
        {field.label}
        {star}
      </label>
      {isPartner && (
        <p className="mb-1 text-[0.68rem] text-white/40">Un simple nom suffit — aucun compte requis.</p>
      )}
      {isLong ? (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-[0.4rem] border border-white/15 bg-transparent px-3 py-2 text-[0.85rem] text-white outline-none focus:border-lime"
        />
      ) : (
        <input
          type={inputType}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-[0.4rem] border border-white/15 bg-transparent px-3 py-2 text-[0.85rem] text-white outline-none focus:border-lime"
        />
      )}
      {field.helpText && <p className="mt-1 text-[0.68rem] text-white/40">{field.helpText}</p>}
    </div>
  )
}
