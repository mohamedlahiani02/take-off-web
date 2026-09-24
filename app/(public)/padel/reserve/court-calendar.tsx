'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BookingFlow, type SlotSelection } from '@/components/booking/booking-flow'
import {
  DAYS_EN,
  MONTHS_EN,
  clubClock,
  dowOf,
  parseKey,
  shiftKey,
  slotTimes,
  todayKey,
  weekDayKeys,
  weekLabel,
  weekStartKey,
} from '@/lib/club-time'

const API = (process.env['NEXT_PUBLIC_API_URL'] ?? '').replace(/\/$/, '')
const SLOTS = slotTimes()

interface Court {
  id: string
  name: string
  activity?: string
}

interface Slot {
  startsAt: string
  available: boolean
  reason: string | null
  openShareSlots: number
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error'
type DaySlots = Record<string, Slot>

/**
 * Court availability and booking.
 *
 * Replaces the prototype page, whose controls were compiled into React `onClick`
 * *strings* and therefore did nothing. Availability is fetched from the browser
 * (it is live, per-day data and not something to prerender), while signing in
 * and booking go through the cookie-session proxies like the rest of the app.
 *
 * An unknown slot is never offered: only availability the server actually
 * published is bookable, so an outage cannot present a free court.
 */
export function CourtCalendar() {
  const [weekStart, setWeekStart] = useState<string>(() => weekStartKey(todayKey()))
  const [courts, setCourts] = useState<Court[]>([])
  const [courtsState, setCourtsState] = useState<LoadState>('loading')
  const [courtId, setCourtId] = useState<string | null>(null)
  const [slots, setSlots] = useState<Record<string, DaySlots | null>>({})
  const [slotsState, setSlotsState] = useState<LoadState>('idle')
  /**
   * The slot the member is currently booking, or null. Selecting a slot only
   * ever sets this: the journey in BookingFlow is what creates a booking, and
   * only on its explicit Confirm.
   */
  const [selection, setSelection] = useState<SlotSelection | null>(null)

  // A reply for a week the member has already navigated away from is dropped.
  const loadToken = useRef(0)

  const days = weekDayKeys(weekStart)
  const today = todayKey()

  // ── data ────────────────────────────────────────────────────────────────
  const loadCourts = useCallback(async () => {
    setCourtsState('loading')
    const token = ++loadToken.current
    try {
      const res = await fetch(`${API}/api/v1/courts`, { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as Court[]
      if (token !== loadToken.current) return
      const padel = (Array.isArray(data) ? data : []).filter(
        (c) => !c.activity || c.activity === 'PADEL',
      )
      setCourts(padel)
      setCourtId(padel[0]?.id ?? null)
      setCourtsState(padel.length ? 'ready' : 'idle')
    } catch {
      if (token !== loadToken.current) return
      // No invented demo courts: an outage is an outage.
      setCourts([])
      setCourtId(null)
      setCourtsState('error')
    }
  }, [])

  const loadSlots = useCallback(
    async (court: string, start: string) => {
      setSlotsState('loading')
      const token = ++loadToken.current
      const keys = weekDayKeys(start)
      const results = await Promise.all(
        keys.map(async (ds) => {
          try {
            const res = await fetch(
              `${API}/api/v1/courts/${court}/slots?date=${encodeURIComponent(ds)}`,
              { cache: 'no-store' },
            )
            if (!res.ok) throw new Error(String(res.status))
            const raw = (await res.json()) as Slot[]
            const byTime: DaySlots = {}
            for (const s of Array.isArray(raw) ? raw : []) {
              if (!s.startsAt) continue
              byTime[clubClock(s.startsAt).timeStr] = {
                startsAt: s.startsAt,
                available: !!s.available,
                reason: s.reason ?? null,
                openShareSlots: Number(s.openShareSlots) || 0,
              }
            }
            return [ds, byTime] as const
          } catch {
            return [ds, null] as const // day failed; never shown as free
          }
        }),
      )
      if (token !== loadToken.current) return
      setSlots(Object.fromEntries(results))
      setSlotsState(results.some(([, v]) => v !== null) ? 'ready' : 'error')
    },
    [],
  )

  useEffect(() => {
    void loadCourts()
  }, [loadCourts])

  useEffect(() => {
    if (courtId) void loadSlots(courtId, weekStart)
  }, [courtId, weekStart, loadSlots])

  /**
   * Selecting a slot opens the booking journey and does nothing else. No
   * booking row is created and no wallet is touched until the member confirms
   * on the summary step.
   */
  function pickSlot(date: string, time: string, slot: Slot) {
    if (!courtId) return
    setSelection({
      courtId,
      courtName: courts.find((c) => c.id === courtId)?.name ?? 'Court',
      date,
      time,
      startsAt: slot.startsAt,
      shareOnly: slot.reason === 'SHARE_OPEN' && slot.openShareSlots > 0,
      openShareSlots: slot.openShareSlots,
    })
  }

  const nowMs = Date.now()

  return (
    <>
      {/* Week navigation */}
      <div className="mb-7 flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setWeekStart((w) => shiftKey(w, -7))}
          aria-label="Previous week"
          className="rounded-full border border-lime/30 px-3 py-2 font-mono text-[0.68rem] tracking-[0.1em] text-lime/90 hover:border-lime/60"
        >
          ‹ Prev week
        </button>
        <span
          id="pr-week-label"
          aria-live="polite"
          className="font-mono text-[0.72rem] tracking-[0.12em] text-white/80"
        >
          {weekLabel(weekStart, 7, DAYS_EN, MONTHS_EN)}
        </span>
        <button
          type="button"
          onClick={() => setWeekStart((w) => shiftKey(w, 7))}
          aria-label="Next week"
          className="rounded-full border border-lime/30 px-3 py-2 font-mono text-[0.68rem] tracking-[0.1em] text-lime/90 hover:border-lime/60"
        >
          Next week ›
        </button>
        <button
          type="button"
          onClick={() => setWeekStart(weekStartKey(todayKey()))}
          className="rounded-full bg-lime px-3 py-2 font-mono text-[0.68rem] tracking-[0.1em] font-bold text-navy"
        >
          Today
        </button>
      </div>

      {/* Court tabs */}
      <div id="pr-court-tabs" className="mb-5 flex flex-wrap gap-2">
        {courtsState === 'loading' && (
          <span className="font-mono text-[0.68rem] tracking-[0.1em] text-white/40">
            Loading courts…
          </span>
        )}
        {courtsState === 'idle' && (
          <span className="font-mono text-[0.68rem] tracking-[0.1em] text-white/40">
            No courts are open for booking.
          </span>
        )}
        {courtsState === 'error' && (
          <>
            <span className="font-mono text-[0.68rem] tracking-[0.1em] text-white/40">
              Courts are unavailable right now.
            </span>
            <button
              type="button"
              onClick={() => void loadCourts()}
              className="rounded-full border border-lime/40 px-3 py-1.5 font-mono text-[0.65rem] text-lime"
            >
              Retry
            </button>
          </>
        )}
        {courtsState === 'ready' &&
          courts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCourtId(c.id)}
              aria-pressed={c.id === courtId}
              className={`rounded-full border px-4 py-2 font-mono text-[0.68rem] tracking-[0.1em] transition-colors ${
                c.id === courtId
                  ? 'border-lime bg-lime text-navy'
                  : 'border-white/15 text-white/70 hover:border-white/35'
              }`}
            >
              {c.name}
            </button>
          ))}
      </div>

      {/* Grid — scrolls sideways on a phone instead of shrinking the cells. */}
      <div className="-mx-[max(1rem,5vw)] overflow-x-auto px-[max(1rem,5vw)]">
        <div
          id="pr-grid"
          className="grid min-w-[42rem] gap-1"
          style={{ gridTemplateColumns: 'minmax(3.5rem,auto) repeat(7, minmax(0,1fr))' }}
        >
          {courtsState === 'error' || slotsState === 'error' ? (
            <div className="col-span-full py-12 text-center font-mono text-[0.72rem] leading-loose tracking-[0.08em] text-white/60">
              Availability is unavailable right now.
              <br />
              No slots can be shown or booked until it loads.
              <br />
              <button
                type="button"
                onClick={() => courtId && void loadSlots(courtId, weekStart)}
                className="mt-4 rounded-full border border-lime/40 px-4 py-2 text-lime"
              >
                Retry
              </button>
            </div>
          ) : slotsState !== 'ready' ? (
            <div className="col-span-full py-12 text-center font-mono text-[0.72rem] text-white/40">
              Loading availability…
            </div>
          ) : (
            <>
              <div className="pr-grid-header-cell" />
              {days.map((ds) => {
                const p = parseKey(ds)
                const isToday = ds === today
                return (
                  <div
                    key={ds}
                    className={`pr-grid-header-cell py-2 text-center ${isToday ? 'today' : ''}`}
                  >
                    <div className="font-mono text-[0.6rem] tracking-[0.1em] text-white/50">
                      {DAYS_EN[dowOf(ds)]}
                    </div>
                    <div
                      className={`font-display text-[1rem] ${isToday ? 'text-lime' : 'text-cream'}`}
                    >
                      {p.d}
                    </div>
                  </div>
                )
              })}

              {SLOTS.map((time) => (
                <FragmentRow
                  key={time}
                  time={time}
                  days={days}
                  slots={slots}
                  nowMs={nowMs}
                  onPick={pickSlot}
                />
              ))}
            </>
          )}
        </div>
      </div>

      <BookingFlow
        selection={selection}
        onClose={() => setSelection(null)}
        // Re-read authoritative availability rather than guessing locally.
        onBooked={() => courtId && void loadSlots(courtId, weekStart)}
      />
    </>
  )
}

/** One time row: the hour label plus its seven day cells. */
function FragmentRow({
  time,
  days,
  slots,
  nowMs,
  onPick,
}: {
  time: string
  days: string[]
  slots: Record<string, DaySlots | null>
  nowMs: number
  onPick: (date: string, time: string, slot: Slot) => void
}) {
  return (
    <>
      <div className="pr-grid-time py-2 pr-2 text-right font-mono text-[0.62rem] text-white/45">
        {time}
      </div>
      {days.map((ds) => {
        const day = slots[ds]
        const slot = day?.[time]
        let cell: React.ReactNode

        if (!day || !slot) {
          // The day failed to load, or the server never published this slot.
          cell = (
            <div className="pr-slot-inner pr-slot-blocked" title="Not available">
              —
            </div>
          )
        } else if (new Date(slot.startsAt).getTime() <= nowMs) {
          cell = (
            <div className="pr-slot-inner pr-slot-blocked" title="Past">
              —
            </div>
          )
        } else if (slot.available) {
          const joinable = slot.reason === 'SHARE_OPEN' && slot.openShareSlots > 0
          cell = (
            <button
              type="button"
              onClick={() => onPick(ds, time, slot)}
              title={joinable ? `Join this match — ${slot.openShareSlots} place(s) left` : undefined}
              className={`${joinable ? 'pr-slot-share-open' : 'pr-slot-free'} h-full w-full rounded-[0.35rem] py-2 text-[0.7rem]`}
            >
              {time}
              {joinable && (
                <>
                  <br />
                  <span className="pr-slot-share-note">JOIN · {slot.openShareSlots}</span>
                </>
              )}
            </button>
          )
        } else {
          cell = (
            <div className="pr-slot-inner pr-slot-booked py-2 text-[0.7rem]">
              {time}
              <br />
              <span className="text-[0.55rem] opacity-70">
                {slot.reason === 'BLOCKED' ? 'BLOCKED' : 'BOOKED'}
              </span>
            </div>
          )
        }
        return (
          <div key={ds} className="pr-slot">
            {cell}
          </div>
        )
      })}
    </>
  )
}
