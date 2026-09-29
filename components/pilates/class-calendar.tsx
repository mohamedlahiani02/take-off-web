'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DAYS_EN,
  MONTHS_EN,
  clubMidnight,
  dowOf,
  parseKey,
  shiftKey,
  todayKey,
  weekDayKeys,
  weekLabel,
  weekStartKey,
} from '@/lib/club-time'
import { PilatesBookingFlow, type PilatesSession } from '@/components/pilates/booking-flow'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

/** One row per opening hour, matching the club's 07:00–21:00 grid. */
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

function instantAt(key: string): string {
  const p = parseKey(key)
  return clubMidnight(p.y, p.m, p.d).toISOString()
}

/** Club-day key and hour a session falls on, independent of the browser's zone. */
function clubSlot(iso: string): { day: string; hour: number; minute: number } {
  const d = new Date(Date.parse(iso) + 60 * 60_000) // CLUB_OFFSET_MIN
  return {
    day: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  }
}

/**
 * A real week grid (time rows x 7 day columns), matching the calendar the
 * prototype had at this route — a day-tab-plus-list view reads flatter and
 * loses the at-a-glance week shape members were used to.
 */
export function ClassCalendar() {
  const [weekStart, setWeekStart] = useState<string>(() => weekStartKey(todayKey()))
  const [sessions, setSessions] = useState<PilatesSession[]>([])
  const [state, setState] = useState<LoadState>('idle')
  const [selected, setSelected] = useState<PilatesSession | null>(null)
  const [busyBookingId, setBusyBookingId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  // Session whose booking the member is about to cancel, pending confirmation
  // — the member must see the policy consequence (late vs. non-late) before
  // the DELETE actually fires, not after.
  const [confirmCancel, setConfirmCancel] = useState<PilatesSession | null>(null)

  const days = weekDayKeys(weekStart)
  const today = todayKey()

  const load = useCallback(async () => {
    setState('loading')
    try {
      const from = instantAt(weekStart)
      const to = instantAt(shiftKey(weekStart, 7))
      const res = await fetch(`/api/classes/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) {
        setState('error')
        return
      }
      const data = (await res.json()) as PilatesSession[]
      setSessions(Array.isArray(data) ? data : [])
      setState('ready')
    } catch {
      setState('error')
    }
  }, [weekStart])

  useEffect(() => {
    void load()
  }, [load])

  /** "day-key|hour" -> sessions starting in that grid cell. */
  const cellMap = useMemo(() => {
    const m: Record<string, PilatesSession[]> = {}
    for (const s of sessions) {
      const { day, hour } = clubSlot(s.startsAt)
      const key = `${day}|${hour}`
      ;(m[key] ??= []).push(s)
    }
    for (const k of Object.keys(m)) m[k]!.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    return m
  }, [sessions])

  const cancel = useCallback(
    async (bookingId: string) => {
      setBusyBookingId(bookingId)
      setNotice('')
      try {
        const res = await fetch(`/api/classes/bookings/${bookingId}`, { method: 'DELETE', credentials: 'include' })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
          setNotice((data['detail'] as string) ?? 'Annulation impossible.')
          return
        }
        await load()
      } catch {
        setNotice('Erreur réseau — rien n’a été annulé.')
      } finally {
        setBusyBookingId(null)
      }
    },
    [load],
  )

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setWeekStart((w) => shiftKey(w, -7))}
          aria-label="Previous week"
          className="rounded-full border border-navy-alt/25 px-3 py-2 font-mono text-[0.68rem] tracking-[0.1em] text-navy-alt/80 hover:border-navy-alt/50"
        >
          ‹ Prev week
        </button>
        <span id="pl-week-label" aria-live="polite" className="font-mono text-[0.72rem] tracking-[0.12em] text-navy-alt/80">
          {weekLabel(weekStart, 7, DAYS_EN, MONTHS_EN)}
        </span>
        <button
          type="button"
          onClick={() => setWeekStart((w) => shiftKey(w, 7))}
          aria-label="Next week"
          className="rounded-full border border-navy-alt/25 px-3 py-2 font-mono text-[0.68rem] tracking-[0.1em] text-navy-alt/80 hover:border-navy-alt/50"
        >
          Next week ›
        </button>
        <button
          type="button"
          onClick={() => setWeekStart(weekStartKey(todayKey()))}
          className="rounded-full bg-navy-alt px-3 py-2 font-mono text-[0.68rem] tracking-[0.1em] font-bold text-cream"
        >
          Today
        </button>
      </div>

      {notice && <p className="mb-4 rounded-[0.5rem] bg-white px-4 py-3 text-[0.8rem] text-red-600">{notice}</p>}

      {state === 'loading' ? (
        <div className="h-[36rem] animate-pulse rounded-card bg-white" />
      ) : state === 'error' ? (
        <div id="pl-outage" className="rounded-card bg-white p-5 text-center">
          <p className="text-[0.85rem] text-navy-alt/60">Le planning est indisponible pour le moment.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 rounded-full border border-navy-alt/30 px-4 py-2 font-mono text-[0.65rem] text-navy-alt"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div
            id="pl-grid"
            className="min-w-[46rem] overflow-hidden rounded-card border border-navy-alt/10 bg-white"
            style={{ display: 'grid', gridTemplateColumns: '4.5rem repeat(7, 1fr)' }}
          >
            {/* corner */}
            <div className="border-r border-b border-navy-alt/10 bg-cream-alt" />
            {days.map((d) => {
              const isToday = d === today
              return (
                <div key={d} className="border-r border-b border-navy-alt/10 bg-cream-alt px-2 py-3 text-center last:border-r-0">
                  <div className="font-mono text-[0.55rem] tracking-[0.12em] text-navy-alt/50">{DAYS_EN[dowOf(d)]}</div>
                  <div
                    className={`pl-grid-day-num mx-auto mt-1 flex h-8 w-8 items-center justify-center text-[1.05rem] font-bold ${
                      isToday ? 'rounded-full bg-navy-alt text-lime' : 'text-navy-alt'
                    }`}
                  >
                    {parseKey(d).d}
                  </div>
                </div>
              )
            })}

            {HOURS.map((hour) => (
              <div key={hour} className="contents">
                <div className="min-h-[3.75rem] border-r border-b border-navy-alt/10 bg-[#fcfcfa] px-2 pt-2 font-mono text-[0.55rem] tracking-[0.08em] text-navy-alt/40">
                  {String(hour).padStart(2, '0')}:00
                </div>
                {days.map((d) => {
                  const cellSessions = cellMap[`${d}|${hour}`] ?? []
                  return (
                    <div key={d} className="min-h-[3.75rem] border-r border-b border-navy-alt/10 p-1 last:border-r-0">
                      {cellSessions.map((s) => {
                        const cancelled = s.status === 'CANCELLED'
                        const mine = s.myStatus === 'BOOKED' || s.myStatus === 'ATTENDED'
                        const onWaitlist = s.myStatus === 'WAITLIST'
                        const remaining = s.maxSpots - s.bookedSpots
                        let spotsLabel: string
                        let spotsTone: string
                        if (cancelled) {
                          spotsLabel = 'Annulé'
                          spotsTone = 'text-white/50'
                        } else if (mine) {
                          spotsLabel = 'Réservé ✓'
                          spotsTone = 'text-lime'
                        } else if (onWaitlist) {
                          spotsLabel = 'Liste d’attente'
                          spotsTone = 'text-amber-300'
                        } else if (remaining <= 0) {
                          spotsLabel = s.waitlistCount > 0 ? `Complet · ${s.waitlistCount} en attente` : 'Complet'
                          spotsTone = 'text-white/50'
                        } else {
                          spotsLabel = `${remaining}/${s.maxSpots} places`
                          spotsTone = remaining <= 2 ? 'text-amber-300' : 'text-lime'
                        }
                        const sessionDataState = cancelled
                          ? 'CANCELLED'
                          : mine
                            ? 'BOOKED'
                            : onWaitlist
                              ? 'WAITLIST'
                              : remaining <= 0
                                ? 'FULL'
                                : 'OPEN'
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={cancelled}
                            data-session-id={s.id}
                            data-state={sessionDataState}
                            onClick={() => {
                              if (!cancelled && !mine && !onWaitlist) setSelected(s)
                            }}
                            className={`pl-session-card mb-1 block w-full rounded-[0.4rem] bg-navy-alt px-2 py-1.5 text-left text-cream transition hover:brightness-110 ${
                              cancelled ? 'pl-session-cancelled cursor-not-allowed opacity-50 line-through' : ''
                            } ${mine ? 'pl-session-mine outline outline-1 outline-lime' : ''} ${
                              onWaitlist ? 'pl-session-waitlist' : ''
                            } ${!cancelled && !mine && !onWaitlist && remaining <= 0 ? 'pl-session-full' : ''}`}
                          >
                            <div className="text-[0.68rem] leading-tight font-bold">{s.className}</div>
                            {s.instructorName && (
                              <div className="font-mono text-[0.58rem] text-lime">{s.instructorName}</div>
                            )}
                            <div className={`font-mono text-[0.55rem] font-bold ${spotsTone}`}>{spotsLabel}</div>
                            {mine && s.myBookingId && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConfirmCancel(s)
                                }}
                                className="mt-0.5 inline-block font-mono text-[0.55rem] underline"
                              >
                                {busyBookingId === s.myBookingId ? '…' : 'Annuler'}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 font-mono text-[0.6rem] text-navy-alt/40">Heure du club (Africa/Tunis)</p>

      {selected && (
        <PilatesBookingFlow
          session={selected}
          onClose={() => setSelected(null)}
          onBooked={() => {
            setSelected(null)
            void load()
          }}
        />
      )}

      {confirmCancel && (
        <CancelBookingConfirm
          session={confirmCancel}
          busy={busyBookingId === confirmCancel.myBookingId}
          onClose={() => setConfirmCancel(null)}
          onConfirm={async () => {
            const bookingId = confirmCancel.myBookingId!
            setConfirmCancel(null)
            await cancel(bookingId)
          }}
        />
      )}
    </>
  )
}

/**
 * Cancellation-confirmation dialog for a member's own booking. Shown before
 * the DELETE request fires, so the club's policy consequence is understood
 * up front — never as a surprise after the fact:
 *  - within 24h of the session (LATE_CANCEL, unchanged existing rule): no
 *    refund and no credit at all.
 *  - 24h or more out (not late): the wallet is NOT recredited — the member
 *    gets a non-monetary use credit valid for a future booking instead.
 * These are two distinct messages and must never be merged into one.
 */
function CancelBookingConfirm({
  session,
  busy,
  onClose,
  onConfirm,
}: {
  session: PilatesSession
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const hoursUntil = (Date.parse(session.startsAt) - Date.now()) / 3_600_000
  const isLate = hoursUntil < 24

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        id="pl-cancel-confirm-overlay"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[26rem] overflow-y-auto rounded-t-card bg-cream p-5 sm:rounded-card sm:p-6"
      >
        <p className="font-mono text-[0.65rem] tracking-[0.22em] text-navy-alt/50 uppercase">Annuler la réservation</p>
        <h3 className="mt-2 font-display text-[1.2rem] text-navy-alt">{session.className}</h3>

        <div className="mt-4 rounded-[0.5rem] bg-cream-alt p-4">
          {isLate ? (
            <p id="pl-cancel-late-notice" className="text-[0.85rem] leading-relaxed text-navy-alt/80">
              Cette séance commence dans moins de 24h : conformément à la politique du club, cette annulation tardive
              ne donne droit à aucun remboursement ni crédit. Votre place sera simplement libérée.
            </p>
          ) : (
            <p id="pl-cancel-use-credit-notice" className="text-[0.85rem] leading-relaxed text-navy-alt/80">
              Votre place va être libérée. Comme cette annulation n&rsquo;est pas tardive, le montant ne sera pas
              recrédité sur votre wallet : vous recevrez à la place un crédit d&rsquo;utilisation, valable pour
              réserver une prochaine séance.
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            id="pl-cancel-confirm-back"
            onClick={onClose}
            className="rounded-full border border-navy-alt/25 px-4 py-3 font-mono text-[0.65rem] tracking-[0.1em] text-navy-alt/70"
          >
            RETOUR
          </button>
          <button
            type="button"
            id="pl-cancel-confirm-submit"
            disabled={busy}
            onClick={onConfirm}
            className="flex-1 rounded-full bg-navy-alt py-3 text-center text-[0.85rem] font-bold text-cream disabled:opacity-40"
          >
            {busy ? '…' : "Confirmer l'annulation"}
          </button>
        </div>
      </div>
    </div>
  )
}
