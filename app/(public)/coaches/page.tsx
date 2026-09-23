import type { Metadata } from 'next'
import Link from 'next/link'
import { Nav } from '@/components/layout/nav'
import { listCoaches, type PublicCoach } from '@/lib/api/public'
import { getPageContent, text } from '@/lib/api/cms'
import { toSegment } from '@/lib/slug'
import { CoachingForm } from './coaching-form'

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getPageContent('coaches')
  const title = text(cms, 'hero', 'headline', 'Nos coachs')
  const description = text(
    cms,
    'hero',
    'subtitle',
    'Padel et Pilates — encadrement diplômé au Take Off Club, Sfax.',
  )
  return {
    title: `${title} — Take Off Club`,
    description,
    openGraph: { title, description, type: 'website' },
  }
}

function CoachCard({ coach }: { coach: PublicCoach }) {
  const full = `${coach.firstName} ${coach.lastName}`
  return (
    <li>
      <Link
        href={`/coaches/${toSegment(full, coach.id)}`}
        className="group relative block aspect-[3/4] overflow-hidden rounded-card bg-card-navy"
      >
        {coach.photoUrl ? (
          <img
            src={coach.photoUrl}
            alt={full}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center font-display text-[clamp(2rem,8vw,3.5rem)] text-white/12">
            {coach.firstName.charAt(0)}
            {coach.lastName.charAt(0)}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy via-navy/85 to-transparent p-3 pt-10 sm:p-4 sm:pt-12">
          <p className="text-[0.95rem] leading-tight font-bold">
            <span className="text-lime">{coach.firstName}</span>{' '}
            <span className="text-white">{coach.lastName}</span>
          </p>
          <p className="mt-1 font-mono text-[0.6rem] tracking-[0.1em] text-white/70">
            {coach.roleTitle}
          </p>
          {!!coach.specs?.length && (
            <ul className="mt-2 flex flex-wrap gap-1">
              {coach.specs.slice(0, 3).map((s) => (
                <li
                  key={s}
                  className="rounded-full border border-lime/35 px-2 py-0.5 font-mono text-[0.55rem] tracking-[0.06em] text-lime"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Link>
    </li>
  )
}

export default async function CoachesPage() {
  const [cms, padel, pilates] = await Promise.all([
    getPageContent('coaches'),
    listCoaches('PADEL'),
    listCoaches('PILATES'),
  ])

  const kicker = text(cms, 'hero', 'kicker', "L'ÉQUIPE")
  const headline = text(cms, 'hero', 'headline', 'Nos coachs')
  const subtitle = text(
    cms,
    'hero',
    'subtitle',
    'Padel et Pilates — un encadrement diplômé, pour progresser à votre rythme.',
  )
  const formKicker = text(cms, 'form', 'kicker', 'PRENDRE UN COURS')
  const formHeadline = text(cms, 'form', 'headline', 'Envie de progresser')
  const formSubtitle = text(
    cms,
    'form',
    'subtitle',
    'Dites-nous ce que vous cherchez et vos disponibilités : un coach vous rappelle.',
  )

  const groups = [
    { key: 'padel', label: 'Padel', coaches: padel },
    { key: 'pilates', label: 'Pilates', coaches: pilates },
  ].filter((g) => g.coaches.length > 0)

  return (
    <>
      <Nav theme="dark" />
      <main className="min-h-screen bg-navy">
        <section className="relative overflow-hidden px-[max(1rem,5vw)] pt-[max(7rem,16vh)] pb-[max(3rem,7vh)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_15%,rgba(196,239,63,0.12),transparent_60%)]"
          />
          <div className="relative">
            <p className="mb-4 font-mono text-[0.7rem] tracking-[0.3em] text-lime">{kicker}</p>
            <h1 className="font-display text-[clamp(2.5rem,8.5vw,7rem)] leading-[0.88] text-white">
              {headline}
              <span className="text-lime">.</span>
            </h1>
            <p className="mt-4 max-w-[34rem] text-[clamp(0.95rem,1.3vw,1.2rem)] leading-relaxed text-white/65">
              {subtitle}
            </p>
          </div>
        </section>

        <section className="px-[max(1rem,5vw)] pb-[max(3rem,7vh)]">
          {groups.length === 0 ? (
            <p className="rounded-card bg-card-navy px-5 py-8 text-center text-white/55">
              La liste des coachs est momentanément indisponible. Merci de réessayer dans un
              instant.
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.key} className="mb-10 last:mb-0">
                <h2 className="mb-4 font-mono text-[0.65rem] tracking-[0.26em] text-white/40 uppercase">
                  {g.label}
                </h2>
                <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  {g.coaches.map((c) => (
                    <CoachCard key={c.id} coach={c} />
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        <section
          id="coaching-form"
          className="scroll-mt-24 border-t border-white/8 px-[max(1rem,5vw)] py-[max(3rem,8vh)]"
        >
          <div className="mb-8 lg:flex lg:items-end lg:justify-between lg:gap-10">
            <div className="lg:max-w-[38rem]">
              <p className="mb-3 font-mono text-[0.7rem] tracking-[0.3em] text-lime">
                {formKicker}
              </p>
              <h2 className="font-display text-[clamp(2rem,5.5vw,4.5rem)] leading-[0.9] text-white">
                {formHeadline}
                <span className="text-lime">?</span>
              </h2>
              <p className="mt-4 text-[0.95rem] leading-relaxed text-white/65">{formSubtitle}</p>
            </div>
          </div>
          <CoachingForm />
        </section>
      </main>
    </>
  )
}
