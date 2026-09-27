import type { Metadata } from 'next'
import Link from 'next/link'
import { Nav } from '@/components/layout/nav'
import { getPageContent, text } from '@/lib/api/cms'
import { ClassCalendar } from '@/components/pilates/class-calendar'
import { PackCatalogue } from '@/components/pilates/pack-catalogue'

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getPageContent('pilates')
  const title = text(cms, 'hero', 'headline', 'Pilates au Take Off Club')
  const description = text(
    cms,
    'hero',
    'subtitle',
    'Reformer et tapis dans un studio calme et lumineux, à Sfax.',
  )
  return {
    title: `${title} — Take Off Club`,
    description,
    openGraph: { title, description, type: 'website' },
  }
}

export default async function PilatesPage() {
  const cms = await getPageContent('pilates')
  const heroKicker = text(cms, 'hero', 'kicker', 'PILATES')
  const heroHeadline = text(cms, 'hero', 'headline', 'Reformer & mat, à votre rythme')
  const heroSubtitle = text(
    cms,
    'hero',
    'subtitle',
    'Un studio calme et lumineux. Réservez votre place, quand ça vous arrange.',
  )
  const scheduleKicker = text(cms, 'schedule', 'kicker', 'PLANNING')
  const scheduleHeading = text(cms, 'schedule', 'heading', 'Cette semaine')
  const packsKicker = text(cms, 'packs', 'kicker', 'FORFAITS')
  const packsHeading = text(cms, 'packs', 'heading', 'Choisissez votre formule')

  return (
    <>
      <Nav theme="light" />
      <main className="min-h-screen bg-cream">
        <section className="relative overflow-hidden px-[max(1rem,5vw)] pt-[max(7rem,16vh)] pb-[max(4rem,9vh)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_88%_12%,rgba(196,239,63,0.25),transparent_60%)]"
          />
          <div className="relative max-w-[54rem]">
            <p className="mb-4 font-mono text-[0.7rem] tracking-[0.3em] text-lime-dark">{heroKicker}</p>
            <h1 className="font-display text-[clamp(2.5rem,7.5vw,6rem)] leading-[0.92] text-navy-alt">
              {heroHeadline}
            </h1>
            <p className="mt-6 max-w-[32rem] text-[0.95rem] leading-relaxed text-navy-alt/70">{heroSubtitle}</p>
            <Link
              href="/pilates/classes"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-navy-alt px-7 py-4 text-[0.9rem] font-bold text-cream"
            >
              Programme complet →
            </Link>
          </div>
        </section>

        <section className="bg-cream-alt px-[max(1rem,5vw)] pb-[max(4rem,9vh)] pt-[max(3rem,7vh)]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 font-mono text-[0.65rem] tracking-[0.24em] text-lime-dark">{scheduleKicker}</p>
              <h2 className="font-display text-[clamp(1.75rem,4vw,3rem)] text-navy-alt">{scheduleHeading}</h2>
            </div>
            <Link
              href="/pilates/classes"
              className="rounded-full border border-navy-alt/25 px-5 py-2.5 font-mono text-[0.65rem] tracking-[0.1em] text-navy-alt"
            >
              Voir tout le planning →
            </Link>
          </div>
          <ClassCalendar />
        </section>

        <section className="px-[max(1rem,5vw)] py-[max(4rem,9vh)]">
          <p className="mb-2 font-mono text-[0.65rem] tracking-[0.24em] text-lime-dark">{packsKicker}</p>
          <h2 className="mb-8 font-display text-[clamp(1.75rem,4vw,3rem)] text-navy-alt">{packsHeading}</h2>
          <PackCatalogue />
        </section>

        <section className="bg-cream-alt px-[max(1rem,5vw)] py-[max(3rem,7vh)] text-center">
          <p className="text-[0.9rem] text-navy-alt/70">
            Une question sur les cours ou le coaching privé ?
          </p>
          <Link
            href="/coaches"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-navy-alt px-6 py-3 font-mono text-[0.68rem] tracking-[0.1em] text-cream"
          >
            Nos coaches →
          </Link>
        </section>
      </main>
    </>
  )
}
