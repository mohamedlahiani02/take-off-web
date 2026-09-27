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
        <div className="rounded-card bg-white p-5 text-center">
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
                    className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center text-[1.05rem] font-bold ${
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
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={cancelled}
                            data-session-id={s.id}
                            onClick={() => {
                              if (!cancelled && !mine && !onWaitlist) setSelected(s)
                            }}
                            className={`mb-1 block w-full rounded-[0.4rem] bg-navy-alt px-2 py-1.5 text-left text-cream transition hover:brightness-110 ${
                              cancelled ? 'cursor-not-allowed opacity-50 line-through' : ''
                            } ${mine ? 'outline outline-1 outline-lime' : ''}`}
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
                                  void cancel(s.myBookingId!)
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
    </>
  )
}
