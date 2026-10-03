export interface Story {
  text: string
  name: string
  tag: string
}

/**
 * "Elles en parlent" — the prototype's STORIES section. The prototype
 * rotated one quote at a time on a timer; shown as a grid here so every
 * testimonial is readable at rest, without motion a reader has to wait on.
 */
export function PilatesStories({
  kicker,
  heading,
  stories,
}: {
  kicker: string
  heading: string
  stories: Story[]
}) {
  if (!stories.length) return null

  return (
    <section className="bg-cream px-[max(1rem,5vw)] py-[max(4rem,9vh)]">
      <p className="flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.26em] text-navy-alt/50 uppercase">
        <span className="text-[1rem] text-lime-dark">✦</span>
        {kicker}
      </p>
      <h2 className="mt-4 max-w-[20ch] font-display text-[clamp(2.125rem,4.6vw,4.25rem)] leading-none tracking-[-0.02em] text-navy-alt">
        {heading}
      </h2>

      <ul className="mt-10 grid gap-5 md:grid-cols-3">
        {stories.map((s) => (
          <li
            key={s.name}
            className="flex flex-col rounded-card border border-navy-alt/10 bg-cream-alt p-6"
          >
            <p className="flex-1 text-[1rem] leading-[1.65] text-navy-alt/80">“{s.text}”</p>
            <div className="mt-6">
              <div className="text-[0.95rem] font-bold text-navy-alt">{s.name}</div>
              <div className="mt-1 font-mono text-[0.62rem] tracking-[0.14em] text-navy-alt/45">
                {s.tag}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
