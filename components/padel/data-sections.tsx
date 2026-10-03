import Link from 'next/link'
import { listCoaches, listProducts, listTournaments } from '@/lib/api/public'
import { toSegment } from '@/lib/slug'
import { clubClock } from '@/lib/club-time'

/**
 * Padel coaches, on the padel page — the prototype's COACHES section.
 * PADEL coaches only; the pilates instructors have their own section on the
 * pilates page. Cards link to the real coach detail page rather than the
 * prototype's modal.
 */
export async function PadelCoaches({
  kicker,
  heading,
  description,
}: {
  kicker: string
  heading: string
  description: string
}) {
  const coaches = await listCoaches('PADEL')
  if (!coaches.length) return null

  return (
    <section id="coaches" className="bg-navy px-[max(1rem,5vw)] py-[max(4rem,9vh)]">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-[0.7rem] tracking-[0.26em] text-lime uppercase">{kicker}</p>
          <h2 className="mt-4 font-display text-[clamp(2.125rem,4.6vw,4.25rem)] leading-none tracking-[-0.02em] text-white">
            {heading}
          </h2>
        </div>
        <p className="max-w-[20rem] text-[0.95rem] leading-[1.6] text-white/60">{description}</p>
      </div>

      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {coaches.map((c) => {
          const full = `${c.firstName} ${c.lastName}`
          return (
            <li key={c.id}>
              <Link
                href={`/coaches/${toSegment(full, c.id)}`}
                className="group relative block aspect-[3/4] overflow-hidden rounded-card bg-card-navy"
              >
                {c.photoUrl ? (
                  <img
                    src={c.photoUrl}
                    alt={full}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center font-display text-[clamp(2rem,6vw,3rem)] text-white/12">
                    {c.firstName.charAt(0)}
                    {c.lastName.charAt(0)}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy via-navy/85 to-transparent p-4 pt-12">
                  <p className="text-[0.95rem] leading-tight font-bold">
                    <span className="text-lime">{c.firstName}</span>{' '}
                    <span className="text-white">{c.lastName}</span>
                  </p>
                  <p className="mt-1 font-mono text-[0.6rem] tracking-[0.1em] text-white/70">
                    {c.roleTitle}
                  </p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * Upcoming tournaments — the prototype's TOURNAMENTS section. Statuses are
 * the real domain ones (DRAFT | PUBLISHED | REGISTRATION_OPEN |
 * REGISTRATION_CLOSED | ONGOING | FINISHED); there is no CANCELLED or
 * COMPLETED, and assuming otherwise has been a bug here before.
 */
export async function PadelTournaments({ kicker, heading }: { kicker: string; heading: string }) {
  const all = await listTournaments()
  const now = Date.now()
  const upcoming = all
    .filter((t) => t.status !== 'DRAFT' && (!t.startsAt || Date.parse(t.startsAt) >= now))
    .sort((a, b) => Date.parse(a.startsAt ?? '') - Date.parse(b.startsAt ?? ''))
    .slice(0, 3)
  if (!upcoming.length) return null

  return (
    <section className="bg-card-navy px-[max(1rem,5vw)] py-[max(4rem,9vh)]">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[0.7rem] tracking-[0.26em] text-lime uppercase">{kicker}</p>
          <h2 className="mt-4 font-display text-[clamp(2.125rem,4.6vw,4.25rem)] leading-none tracking-[-0.02em] text-white">
            {heading}
          </h2>
        </div>
        <Link
          href="/padel/tournaments"
          className="rounded-full border border-lime/35 px-5 py-2.5 font-mono text-[0.65rem] tracking-[0.1em] text-lime"
        >
          Tous les tournois →
        </Link>
      </div>

      <ul className="grid gap-5 md:grid-cols-3">
        {upcoming.map((t) => {
          const max = t.maxParticipants ?? 0
          const taken = t.currentRegistrations ?? 0
          const remaining = max > 0 ? Math.max(max - taken, 0) : null
          const open = t.status === 'REGISTRATION_OPEN'
          return (
            <li key={t.id}>
              <Link
                href={`/padel/tournaments/${toSegment(t.title, t.id)}`}
                className="flex h-full flex-col rounded-card border border-white/10 bg-navy p-6 transition hover:border-lime/40"
              >
                <span
                  className={`self-start rounded-full px-3 py-1 font-mono text-[0.58rem] tracking-[0.12em] ${
                    open ? 'bg-lime text-navy' : 'border border-white/20 text-white/60'
                  }`}
                >
                  {open ? 'INSCRIPTIONS OUVERTES' : 'BIENTÔT'}
                </span>
                <h3 className="mt-4 text-[1.3rem] leading-tight font-bold text-white">{t.title}</h3>
                {t.startsAt && (
                  <p className="mt-2 font-mono text-[0.7rem] tracking-[0.08em] text-white/55">
                    {clubClock(t.startsAt).dateStr} · {clubClock(t.startsAt).timeStr}
                  </p>
                )}
                <div className="mt-auto pt-5">
                  {remaining !== null && (
                    <p className="font-mono text-[0.7rem] tracking-[0.08em] text-lime">
                      {remaining > 0 ? `${remaining} place(s) restante(s)` : 'Complet'}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Padel gear from the real catalogue — the prototype's SHOP section (the
 *  one light band on the padel page). Renders nothing if the catalogue is
 *  unreachable rather than an empty shelf. */
export async function PadelShop({ kicker, heading }: { kicker: string; heading: string }) {
  const products = await listProducts()
  if (!products) return null
  const wanted = /racket|raquette|padel|accessoir|accessor|balle|ball|grip|wear|apparel|lifestyle/i
  const active = products.filter((p) => p.isActive !== false)
  const items = (active.filter((p) => wanted.test(`${p.category ?? ''} ${p.name}`)).length
    ? active.filter((p) => wanted.test(`${p.category ?? ''} ${p.name}`))
    : active
  ).slice(0, 4)
  if (!items.length) return null

  return (
    <section className="bg-cream px-[max(1rem,5vw)] py-[max(4rem,9vh)]">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[0.7rem] tracking-[0.26em] text-lime-dark uppercase">
            {kicker}
          </p>
          <h2 className="mt-4 font-display text-[clamp(2.125rem,4.6vw,4.25rem)] leading-none tracking-[-0.02em] text-navy-alt">
            {heading}
          </h2>
        </div>
        <Link
          href="/store"
          className="rounded-full border border-navy-alt/25 px-5 py-2.5 font-mono text-[0.65rem] tracking-[0.1em] text-navy-alt"
        >
          Toute la boutique →
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((p) => (
          <li key={p.id}>
            <Link href={`/store/${toSegment(p.name, p.id)}`} className="group block">
              <div className="relative aspect-square w-full overflow-hidden rounded-card bg-cream-alt">
                {p.imageUrls?.[0] ? (
                  <img
                    src={p.imageUrls[0]}
                    alt={p.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center font-mono text-[0.6rem] tracking-[0.14em] text-navy-alt/30">
                    TAKE OFF
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-[0.95rem] leading-tight font-semibold text-navy-alt">
                {p.name}
              </h3>
              {typeof p.priceDt === 'number' && (
                <div className="mt-1 font-mono text-[0.72rem] text-lime-dark">
                  {p.priceDt.toFixed(3)} DT
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
