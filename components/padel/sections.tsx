import Link from 'next/link'

export interface HeroStat {
  big: string
  label: string
}

/**
 * The padel hero: full-bleed court video under two gradient washes, the
 * headline sitting on the bottom edge, and the walk-in booking card (the
 * club's real phone/WhatsApp) alongside the stats — the prototype's layout,
 * which the migration never carried over.
 */
export function PadelHero({
  kicker,
  headline,
  subtitle,
  ctaLabel,
  stats,
}: {
  kicker: string
  headline: string
  subtitle: string
  ctaLabel: string
  stats: HeroStat[]
}) {
  return (
    <section className="relative flex min-h-[86vh] items-end overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/prototype-assets/Photos/heroo.jpg"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/prototype-assets/Videos/padel-hero.mp4" type="video/mp4" />
      </video>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,23,51,0.7)_0%,rgba(10,23,51,0.35)_38%,rgba(10,23,51,0.92)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_80%_0%,rgba(43,107,240,0.4),transparent_55%)]"
      />

      <div className="relative z-[3] flex w-full flex-wrap items-end justify-between gap-10 px-[max(1rem,5vw)] pt-[max(8rem,20vh)] pb-[max(3rem,7vh)]">
        <div className="max-w-[55rem]">
          <p className="mb-5 font-mono text-[0.78rem] tracking-[0.32em] text-lime">{kicker}</p>
          <h1 className="font-display text-[clamp(3.5rem,12vw,13rem)] leading-[0.84] tracking-[0.005em] whitespace-pre-line text-white [text-shadow:0_14px_60px_rgba(0,0,0,0.45)]">
            {headline}
          </h1>
          <p className="mt-6 max-w-[30rem] text-[clamp(1rem,1.4vw,1.3rem)] leading-[1.5] text-cream/80">
            {subtitle}
          </p>
          <Link
            href="/padel/reserve"
            className="mt-8 inline-flex items-center gap-3.5 rounded-full bg-lime py-4 pr-4 pl-7 text-[1rem] font-bold text-navy transition hover:brightness-105"
          >
            {ctaLabel}
            <span className="grid h-[2.125rem] w-[2.125rem] place-items-center rounded-full bg-navy text-lime">
              ↗
            </span>
          </Link>
        </div>

        <div className="flex max-w-[21rem] flex-col gap-5">
          <div className="rounded-[1.125rem] border border-lime/30 bg-navy/70 px-5 py-5 backdrop-blur-[8px]">
            <p className="mb-2.5 font-mono text-[0.62rem] tracking-[0.3em] text-lime">
              RÉSERVATION SPONTANÉE
            </p>
            <p className="mb-1.5 font-display text-[2.25rem] leading-none tracking-[0.01em] text-lime">
              +216 27 314 100
            </p>
            <p className="mb-4 font-mono text-[0.62rem] tracking-[0.18em] text-cream/60">
              WHATSAPP DISPONIBLE 7/7
            </p>
            <div className="flex flex-wrap gap-2.5">
              <a
                href="tel:+21627314100"
                className="inline-flex items-center gap-1.5 rounded-full bg-lime px-4 py-2.5 font-mono text-[0.68rem] font-bold tracking-[0.1em] text-navy"
              >
                📞 APPELER
              </a>
              <a
                href="https://wa.me/21627314100"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-lime px-4 py-2.5 font-mono text-[0.68rem] font-bold tracking-[0.1em] text-lime"
              >
                💬 WHATSAPP
              </a>
            </div>
          </div>

          {stats.map((s) => (
            <div key={s.label} className="flex items-baseline gap-3 border-l-2 border-lime px-5 py-3">
              <span className="font-display text-[2.125rem] leading-none text-white">{s.big}</span>
              <span className="max-w-[9.5rem] font-mono text-[0.68rem] tracking-[0.18em] text-cream/60">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** The lime marquee strip between the hero and the booking block. Holds
 *  still for anyone who asked their system not to animate. */
export function PadelMarquee({ words }: { words: string[] }) {
  const line = words.join(' · ') + ' · '
  return (
    <div className="overflow-hidden border-y-[3px] border-navy bg-lime py-4 whitespace-nowrap text-navy">
      <div className="inline-flex gap-10 motion-safe:animate-[marquee_24s_linear_infinite] motion-reduce:animate-none">
        <span className="font-display text-[1.5rem] tracking-[0.04em]">{line.repeat(2)}</span>
        <span aria-hidden="true" className="font-display text-[1.5rem] tracking-[0.04em]">
          {line.repeat(2)}
        </span>
      </div>
    </div>
  )
}

export interface PadelFormat {
  n: string
  title: string
  desc: string
  href: string
}

/** "Plus qu'un match" — the three ways to play. The numbering is the
 *  prototype's and is real ordering information, not decoration. */
export function PadelFormats({
  kicker,
  heading,
  formats,
}: {
  kicker: string
  heading: string
  formats: PadelFormat[]
}) {
  return (
    <section className="bg-card-navy px-[max(1rem,5vw)] py-[max(4rem,9vh)]">
      <p className="font-mono text-[0.7rem] tracking-[0.26em] text-lime uppercase">{kicker}</p>
      <h2 className="mt-4 font-display text-[clamp(2.125rem,4.6vw,4.25rem)] leading-none tracking-[-0.02em] text-white">
        {heading}
      </h2>

      <ul className="mt-10 grid gap-5 md:grid-cols-3">
        {formats.map((f) => (
          <li key={f.n}>
            <Link
              href={f.href}
              className="group flex h-full flex-col rounded-card border border-white/10 bg-navy p-6 transition hover:border-lime/40"
            >
              <span className="font-mono text-[0.72rem] tracking-[0.18em] text-lime">{f.n}</span>
              <h3 className="mt-3 text-[1.35rem] font-bold text-white">{f.title}</h3>
              <p className="mt-2.5 flex-1 text-[0.95rem] leading-[1.6] text-white/60">{f.desc}</p>
              <span className="mt-5 font-mono text-[0.68rem] tracking-[0.12em] text-lime">
                EN SAVOIR PLUS →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Closing call to action. */
export function PadelCta({
  headline,
  subtitle,
  buttonLabel,
}: {
  headline: string
  subtitle: string
  buttonLabel: string
}) {
  return (
    <section className="bg-navy px-[max(1rem,5vw)] py-[max(5rem,11vh)]">
      <h2 className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-[0.9] whitespace-pre-line text-white">
        {headline}
      </h2>
      <p className="mt-5 max-w-[32rem] text-[1rem] leading-[1.6] text-white/65">{subtitle}</p>
      <Link
        href="/padel/reserve"
        className="mt-8 inline-flex items-center gap-3 rounded-full bg-lime px-7 py-4 text-[1rem] font-bold text-navy transition hover:brightness-105"
      >
        {buttonLabel} →
      </Link>
    </section>
  )
}
