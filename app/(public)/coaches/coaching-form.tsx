'use client'

import { useState } from 'react'

const LESSON_TYPES = ['Padel', 'Pilates', 'Préparation physique'] as const
const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé', 'Compétition'] as const
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const
const SLOTS = ['Matin', 'Midi', 'Soir'] as const

/**
 * Coaching enquiry. Posts to the public endpoint, which validates name, phone
 * and email; everything else is optional.
 *
 * A failed submission keeps the form and its values so nothing is retyped, and
 * never shows the confirmation screen.
 */
export function CoachingForm({ theme = 'dark' }: { theme?: 'dark' | 'light' } = {}) {
  const isDark = theme === 'dark'
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [lessonTypes, setLessonTypes] = useState<string[]>([])
  const [level, setLevel] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const toggleType = (t: string) =>
    setLessonTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const toggleSlot = (key: string) =>
    setAvailability((prev) => ({ ...prev, [key]: !prev[key] }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/coaching/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          lessonTypes,
          level: level || null,
          notes: notes || null,
          // Only the slots actually picked are sent.
          availabilityGrid: Object.fromEntries(
            Object.entries(availability).filter(([, on]) => on),
          ),
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
        setError(
          (body['detail'] as string) ||
            (body['title'] as string) ||
            'Envoi impossible pour le moment. Merci de réessayer.',
        )
        return
      }
      setDone(true)
    } catch {
      setError('Erreur réseau — merci de réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className={`rounded-card p-6 sm:p-8 ${isDark ? 'bg-card-navy' : 'bg-cream-alt'}`}>
        <p
          className={`font-mono text-[0.7rem] tracking-[0.3em] uppercase ${isDark ? 'text-lime' : 'text-lime-dark'}`}
        >
          Envoyé
        </p>
        <p className={`mt-3 text-[1.05rem] ${isDark ? 'text-white' : 'text-navy-alt'}`}>
          Merci — nous vous rappelons très vite.
        </p>
        <p className={`mt-2 text-[0.9rem] ${isDark ? 'text-white/60' : 'text-navy-alt/65'}`}>
          Un coach vous contactera au {phone} pour convenir d’un créneau.
        </p>
      </div>
    )
  }

  const field = isDark
    ? 'w-full rounded-card border border-white/12 bg-white/5 px-4 py-3 text-[0.9rem] text-white placeholder-white/30 focus:border-lime/50 focus:outline-none'
    : 'w-full rounded-card border border-navy-alt/15 bg-white px-4 py-3 text-[0.9rem] text-navy-alt placeholder-navy-alt/35 focus:border-lime-dark/60 focus:outline-none'
  const legend = isDark
    ? 'mb-2 font-mono text-[0.65rem] tracking-[0.22em] text-white/40 uppercase'
    : 'mb-2 font-mono text-[0.65rem] tracking-[0.22em] text-navy-alt/50 uppercase'
  const chipOff = isDark
    ? 'border-white/15 text-white/65 hover:border-white/35'
    : 'border-navy-alt/20 text-navy-alt/70 hover:border-navy-alt/45'
  const chipAccentOff = isDark
    ? 'border-lime/35 text-lime/85 hover:border-lime/60'
    : 'border-lime-dark/40 text-lime-dark hover:border-lime-dark/70'
  const chipOn = isDark ? 'border-lime bg-lime text-navy' : 'border-lime-dark bg-lime-dark text-cream'
  const gridHead = isDark ? 'text-white/40' : 'text-navy-alt/50'
  const slotOff = isDark
    ? 'border-white/10 bg-white/5 hover:border-white/25'
    : 'border-navy-alt/12 bg-white hover:border-navy-alt/30'
  const slotOn = isDark ? 'border-lime bg-lime/80' : 'border-lime-dark bg-lime-dark/80'
  const submitBtn = isDark
    ? 'bg-lime text-navy'
    : 'bg-navy-alt text-cream'

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label>
          <span className={legend + ' block'}>Nom</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="Votre nom" />
        </label>
        <label>
          <span className={legend + ' block'}>Téléphone</span>
          <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} placeholder="+216 XX XXX XXX" />
        </label>
        <label>
          <span className={legend + ' block'}>Email</span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="vous@exemple.com" />
        </label>
      </div>

      <fieldset>
        <legend className={legend}>Type de cours</legend>
        <div className="flex flex-wrap gap-2">
          {LESSON_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={lessonTypes.includes(t)}
              onClick={() => toggleType(t)}
              className={`rounded-full border px-4 py-2 font-mono text-[0.68rem] tracking-[0.1em] transition-colors ${
                lessonTypes.includes(t)
                  ? chipOn
                  : chipAccentOff
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={legend}>Niveau</legend>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={level === l}
              onClick={() => setLevel(level === l ? '' : l)}
              className={`rounded-full border px-4 py-2 font-mono text-[0.68rem] tracking-[0.1em] transition-colors ${
                level === l
                  ? chipOn
                  : chipOff
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={legend}>Disponibilités</legend>
        {/* Scrolls sideways on a phone rather than shrinking below the touch target. */}
        <div className="-mx-[max(1rem,5vw)] overflow-x-auto px-[max(1rem,5vw)] sm:mx-0 sm:px-0">
          <table className="w-full min-w-[22rem] border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="w-[3.5rem]" />
                {DAYS.map((d) => (
                  <th key={d} className={`font-mono text-[0.6rem] tracking-[0.1em] ${gridHead}`}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((s) => (
                <tr key={s}>
                  <th className={`text-left font-mono text-[0.6rem] tracking-[0.1em] ${gridHead}`}>
                    {s}
                  </th>
                  {DAYS.map((d) => {
                    const key = `${d}|${s}`
                    const on = !!availability[key]
                    return (
                      <td key={key}>
                        <button
                          type="button"
                          aria-label={`${d} ${s}`}
                          aria-pressed={on}
                          onClick={() => toggleSlot(key)}
                          className={`h-9 w-full rounded-[0.4rem] border transition-colors ${
                            on
                              ? slotOn
                              : slotOff
                          }`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>

      <label>
        <span className={legend + ' block'}>Message (facultatif)</span>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={field}
          placeholder="Objectifs, contraintes, questions…"
        />
      </label>

      {error && <p className="text-[0.9rem] text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className={`w-full rounded-full py-4 text-[0.9rem] font-bold disabled:opacity-40 sm:w-auto sm:px-10 ${submitBtn}`}
      >
        {submitting ? 'Envoi…' : 'Envoyer ma demande'}
      </button>
    </form>
  )
}
