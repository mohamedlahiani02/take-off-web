import Link from 'next/link'
import { listCoaches } from '@/lib/api/public'
import { toSegment } from '@/lib/slug'

/**
 * The studio's pilates instructors, on the pilates page itself.
 *
 * The prototype's "EXPERTS" section listed them here; the migration to
 * React dropped it, which left pilates instructors reachable only from the
 * generic /coaches page. Same layout as the prototype: header row with the
 * heading on the left and a short description on the right, then a
 * responsive card grid (4/5 portrait photo, name, role, bio link).
 *
 * Only PILATES coaches appear here — padel coaches belong on the padel
 * side, exactly as the two prototype pages had it.
 */
export async function PilatesInstructors({
  kicker,
  heading,
  description,
}: {
  kicker: string
  heading: string
  description: string
}) {
  const coaches = await listCoaches('PILATES')
  if (!coaches.length) return null

  return (
    <section id="experts" className="bg-cream-alt px-[max(1rem,5vw)] py-[max(4rem,9vh)]">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.26em] text-navy-alt/50 uppercase">
            <span className="text-[1rem] text-lime-dark">✦</span>
            {kicker}
          </p>
          <h2 className="mt-4 font-display text-[clamp(2.125rem,4.6vw,4.25rem)] leading-none tracking-[-0.02em] text-navy-alt">
            {heading}
          </h2>
        </div>
        <p className="max-w-[18.75rem] text-[0.95rem] leading-[1.6] text-navy-alt/60">{description}</p>
      </div>

      <ul className="grid grid-cols-[repeat(auto-fit,minmax(13.75rem,1fr))] gap-[1.125rem]">
        {coaches.map((c) => {
          const full = `${c.firstName} ${c.lastName}`
          return (
            <li key={c.id}>
              <Link href={`/coaches/${toSegment(full, c.id)}`} className="group block">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.125rem] bg-navy-alt/10">
                  {c.photoUrl ? (
                    <img
                      src={c.photoUrl}
                      alt={full}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center font-display text-[clamp(2rem,6vw,3rem)] text-navy-alt/20">
                      {c.firstName.charAt(0)}
                      {c.lastName.charAt(0)}
                    </span>
                  )}
                </div>
                <h3 className="mt-[1.125rem] text-[1.25rem] font-bold text-navy-alt">{full}</h3>
                <div className="mt-1.5 font-mono text-[0.7rem] tracking-[0.1em] text-navy-alt/55">
                  {c.roleTitle}
                </div>
                <div className="mt-2.5 text-[0.82rem] text-navy-alt/55 group-hover:text-navy-alt">
                  Voir le profil →
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
