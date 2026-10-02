import type { Metadata } from 'next'
import { Nav } from '@/components/layout/nav'
import { Footer } from '@/components/layout/footer'
import { getPageContent, text } from '@/lib/api/cms'
import { ClassCalendar } from '@/components/pilates/class-calendar'

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getPageContent('pilates')
  const title = text(cms, 'schedule', 'heading', 'Planning des cours')
  const description = text(
    cms,
    'schedule',
    'description',
    'Réformer et tapis, places en direct. Réservez au Take Off Club, Sfax.',
  )
  return {
    title: `${title} — Take Off Club`,
    description,
    openGraph: { title, description, type: 'website' },
  }
}

export default async function PilatesClassesPage() {
  const cms = await getPageContent('pilates')
  const kicker = text(cms, 'schedule', 'kicker', 'PLANNING')
  const heading = text(cms, 'schedule', 'heading', 'Réservez votre cours')

  return (
    <>
      <Nav theme="light" />
      <main className="min-h-screen bg-cream">
        <section className="px-[max(1rem,5vw)] pt-[max(7rem,16vh)] pb-[max(2rem,5vh)]">
          <p className="mb-4 font-mono text-[0.7rem] tracking-[0.3em] text-lime-dark">{kicker}</p>
          <h1 className="max-w-[54rem] font-display text-[clamp(2.25rem,7vw,5.5rem)] leading-[0.9] text-navy-alt">
            {heading}
          </h1>
        </section>

        <section className="bg-cream-alt px-[max(1rem,5vw)] pb-[max(4rem,9vh)] pt-[max(2rem,5vh)]">
          <ClassCalendar />
        </section>
      </main>
      <Footer theme="light" />
    </>
  )
}
