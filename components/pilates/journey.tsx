export interface JourneyStep {
  n: string
  title: string
  desc: string
}

/**
 * "Comment ça marche" — the prototype's JOURNEY section: the one dark band
 * on an otherwise light page, with the numbered steps from booking to class.
 * The numbering is real sequence information (the order you actually do
 * these in), not decoration.
 */
export function PilatesJourney({
  kicker,
  heading,
  steps,
}: {
  kicker: string
  heading: string
  steps: JourneyStep[]
}) {
  if (!steps.length) return null

  return (
    <section className="bg-navy-alt px-[max(1rem,5vw)] py-[max(4rem,9vh)] text-cream">
      <p className="flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.26em] text-cream/50 uppercase">
        <span className="text-[1rem] text-lime">✦</span>
        {kicker}
      </p>
      <h2 className="mt-4 max-w-[20ch] font-display text-[clamp(2.125rem,4.6vw,4.25rem)] leading-none tracking-[-0.02em]">
        {heading}
      </h2>

      <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
        {steps.map((s) => (
          <li key={s.n} className="border-t border-cream/15 pt-6">
            <div className="font-mono text-[0.78rem] tracking-[0.18em] text-lime">{s.n}</div>
            <h3 className="mt-3 text-[1.35rem] font-bold">{s.title}</h3>
            <p className="mt-2.5 text-[0.95rem] leading-[1.6] text-cream/65">{s.desc}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
