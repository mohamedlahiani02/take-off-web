import Link from 'next/link'
import { Nav } from '@/components/layout/nav'

/**
 * Shared frame for the public detail pages.
 *
 * Mobile-first: the base styles target a narrow viewport (single column, fluid
 * side gutters, fluid type) and every larger-screen rule is additive via
 * `sm:` / `lg:` min-width variants. No fixed pixel widths anywhere — sizes are
 * expressed in rem, %, vw or clamp() so the layout scales with the viewport and
 * with the reader's font-size setting.
 */
export function DetailShell({
  eyebrow,
  title,
  backHref,
  backLabel,
  children,
}: {
  eyebrow: string
  title: string
  backHref: string
  backLabel: string
  children: React.ReactNode
}) {
  return (
    <>
      <Nav theme="dark" />
      <main className="min-h-screen bg-navy pb-[max(4rem,10vh)] pt-[max(6rem,14vh)]">
        <div className="mx-auto w-full max-w-[min(64rem,92vw)] px-[max(1rem,4vw)]">
          <Link
            href={backHref}
            className="inline-block font-mono text-[0.7rem] tracking-[0.22em] text-white/45 transition-colors hover:text-lime"
          >
            ← {backLabel}
          </Link>

          <p className="mt-6 font-mono text-[0.7rem] tracking-[0.3em] text-lime uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-display text-[clamp(2rem,8vw,4.5rem)] leading-[0.95] tracking-tight text-white">
            {title}
          </h1>

          <div className="mt-8 sm:mt-10">{children}</div>
        </div>
      </main>
    </>
  )
}

/** A labelled fact. Stacks on mobile, sits inline once there is room. */
export function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-white/10 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="font-mono text-[0.65rem] tracking-[0.22em] text-white/40 uppercase">
        {label}
      </span>
      <span className="text-[0.95rem] text-white/85 sm:text-right">{value}</span>
    </div>
  )
}

export function Chips({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full border border-lime/35 px-3 py-1 font-mono text-[0.65rem] tracking-[0.14em] text-lime/90"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

/** Shown when the API is unreachable — never mistaken for "does not exist". */
export function Unavailable({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <>
      <Nav theme="dark" />
      <main className="flex min-h-screen items-center bg-navy px-[max(1rem,4vw)] pt-[max(6rem,14vh)] pb-[max(4rem,10vh)]">
        <div className="mx-auto w-full max-w-[min(32rem,92vw)]">
          <p className="font-mono text-[0.7rem] tracking-[0.3em] text-lime uppercase">
            Temporairement indisponible
          </p>
          <h1 className="mt-3 font-display text-[clamp(1.75rem,7vw,3rem)] leading-[0.95] text-white">
            Contenu indisponible
          </h1>
          <p className="mt-4 text-white/60">
            Nous n’arrivons pas à joindre le service pour le moment. Merci de réessayer dans un
            instant.
          </p>
          <Link
            href={backHref}
            className="mt-7 inline-block rounded-full bg-lime px-6 py-3 text-[0.85rem] font-bold text-navy"
          >
            {backLabel}
          </Link>
        </div>
      </main>
    </>
  )
}
