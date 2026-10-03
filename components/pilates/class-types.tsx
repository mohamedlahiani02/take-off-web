export interface PilatesClassType {
  name: string
  level: string
  dur: string
  desc: string
  photoUrl?: string | null
}

/**
 * "Nos cours" — the prototype's CLASSES section: a centred header and a
 * responsive grid of class-type cards (4/3 photo, level pill, duration, name,
 * blurb, link into the schedule).
 *
 * The cards are marketing copy, not bookable data: the prototype read them
 * from `cms.classes.items` and rendered nothing when the admin had not filled
 * them in. Here the CMS still wins, but static defaults stand in so the
 * section is never an empty shell. Real, bookable sessions live in the
 * schedule section above, which is API-driven.
 */
export function PilatesClassTypes({
  kicker,
  heading,
  items,
}: {
  kicker: string
  heading: string
  items: PilatesClassType[]
}) {
  if (!items.length) return null

  return (
    <section id="cours" className="bg-cream-alt px-[max(1rem,5vw)] py-[max(4rem,9vh)]">
      <div className="mb-12 text-center">
        <p className="flex items-center justify-center gap-2 font-mono text-[0.7rem] tracking-[0.26em] text-navy-alt/50 uppercase">
          <span className="text-[1rem] text-lime-dark">✦</span>
          {kicker}
        </p>
        <h2 className="mx-auto mt-4 max-w-[40rem] font-display text-[clamp(2.125rem,4.6vw,4.375rem)] leading-none tracking-[-0.02em] text-navy-alt">
          {heading}
        </h2>
      </div>

      <ul className="grid gap-5 sm:grid-cols-[repeat(auto-fit,minmax(17.5rem,1fr))]">
        {items.map((c) => (
          <li
            key={c.name}
            className="overflow-hidden rounded-large border border-navy-alt/6 bg-white transition-transform duration-500 ease-lift hover:-translate-y-1"
          >
            <div className="relative aspect-[4/3] w-full bg-cream-alt">
              {c.photoUrl ? (
                <img
                  src={c.photoUrl}
                  alt={c.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <span className="absolute inset-0 grid place-items-center font-mono text-[0.6rem] tracking-[0.18em] text-navy-alt/25">
                  PILATES
                </span>
              )}
            </div>
            <div className="p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <span className="rounded-full bg-lime/40 px-2.5 py-1.5 font-mono text-[0.62rem] tracking-[0.14em] text-lime-dark uppercase">
                  {c.level}
                </span>
                <span className="font-mono text-[0.7rem] text-navy-alt/50">{c.dur}</span>
              </div>
              <h3 className="text-[1.5rem] font-bold tracking-[-0.01em] text-navy-alt">{c.name}</h3>
              <p className="mt-2.5 text-[0.875rem] leading-[1.55] text-navy-alt/62">{c.desc}</p>
              <a
                href="#planning"
                className="mt-4 inline-flex items-center gap-2 text-[0.875rem] font-semibold text-navy-alt hover:text-lime-dark"
              >
                Trouver une séance <span aria-hidden="true">→</span>
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
