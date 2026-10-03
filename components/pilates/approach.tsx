/**
 * "Notre approche" — the prototype's INCLUSIVE section.
 *
 * Two columns: a pair of staggered 3/4 portraits on the left, the heading,
 * body copy and tick-list on the right. Stacks to one column on a phone, and
 * the stagger (the second photo pushed down) is dropped there so the pair
 * stays level.
 */
export function PilatesApproach({
  kicker,
  heading,
  body,
  points,
  photo1,
  photo2,
}: {
  kicker: string
  heading: string
  body: string
  points: string[]
  photo1: string
  photo2: string
}) {
  return (
    <section className="bg-cream px-[max(1rem,5vw)] py-[max(3.5rem,8vh)]">
      <div className="grid items-center gap-[clamp(2rem,5vw,4rem)] lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-4">
          <img
            src={photo1}
            alt=""
            loading="lazy"
            className="block aspect-[3/4] w-full rounded-[1.125rem] object-cover"
          />
          <img
            src={photo2}
            alt=""
            loading="lazy"
            className="block aspect-[3/4] w-full rounded-[1.125rem] object-cover sm:mt-10"
          />
        </div>

        <div>
          <p className="flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.26em] text-navy-alt/50 uppercase">
            <span className="text-[1rem] text-lime-dark">✦</span>
            {kicker}
          </p>
          <h2 className="mt-5 font-display text-[clamp(2.125rem,4vw,3.875rem)] leading-[1.02] tracking-[-0.02em] text-navy-alt">
            {heading}
          </h2>
          <p className="mt-5 max-w-[28.75rem] text-[1.05rem] leading-[1.6] text-navy-alt/66">
            {body}
          </p>
          <ul className="mt-7 flex flex-col gap-3.5">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3.5">
                <span
                  aria-hidden="true"
                  className="grid h-[1.875rem] w-[1.875rem] shrink-0 place-items-center rounded-full bg-navy-alt text-[0.8rem] text-lime"
                >
                  ✓
                </span>
                <span className="text-[0.95rem] text-navy-alt/80">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
