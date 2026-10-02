import type { Metadata } from 'next'
import Link from 'next/link'
import { Nav } from '@/components/layout/nav'
import { Footer } from '@/components/layout/footer'
import { PilatesInstructors } from '@/components/pilates/instructors'
import { getPageContent, text } from '@/lib/api/cms'
import { apiBase } from '@/lib/api/base'
import { ClassCalendar } from '@/components/pilates/class-calendar'
import { PackCatalogue } from '@/components/pilates/pack-catalogue'
import { clubClock, shiftKey, todayKey, DAYS_FR } from '@/lib/club-time'

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

interface NextSession {
  className: string
  timeStr: string
  when: string
}

/** Mirrors the prototype's own "next upcoming session" hero badge: the
 *  earliest still-bookable session in the coming week, labelled TODAY /
 *  DEMAIN / a weekday name — computed from the real schedule, never
 *  invented. */
async function nextUpcomingSession(): Promise<NextSession | null> {
  const base = apiBase()
  if (!base) return null
  const from = new Date()
  const to = new Date(from.getTime() + 7 * 24 * 3600_000)
  try {
    const res = await fetch(
      `${base}/api/v1/classes/schedule?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return null
    const sessions = (await res.json()) as { className: string; startsAt: string; status: string }[]
    const now = Date.now()
    const today = todayKey()
    const tomorrow = shiftKey(today, 1)
    const upcoming = sessions
      .filter((s) => s.status === 'SCHEDULED' && Date.parse(s.startsAt) > now)
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0]
    if (!upcoming) return null
    const { dateStr, timeStr } = clubClock(upcoming.startsAt)
    const when =
      dateStr === today ? "AUJOURD'HUI" : dateStr === tomorrow ? 'DEMAIN' : DAYS_FR[new Date(upcoming.startsAt).getUTCDay()].toUpperCase()
    return { className: upcoming.className, timeStr, when }
  } catch {
    return null
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
  const instructorsKicker = text(cms, 'instructors', 'kicker', 'NOS INSTRUCTEURS')
  const instructorsHeading = text(cms, 'instructors', 'heading', 'Encadré·e à chaque mouvement')
  const instructorsDesc = text(
    cms,
    'instructors',
    'subtitle',
    'Des instructeurs diplômés qui adaptent chaque séance à votre niveau et à votre corps.',
  )
  const heroStats = [
    { big: '450+', label: 'SÉANCES / MOIS' },
    { big: '70+', label: 'COURS PAR SEMAINE' },
    { big: '96%', label: 'SE SENTENT PLUS FORTS' },
  ]
  const nextSession = await nextUpcomingSession()

  return (
    <>
      <Nav theme="light" />
      <main className="min-h-screen bg-cream">
        {/* Hero: same two-column layout as the prototype (copy + CTAs + stats
            on the left, the studio video with a floating "next session"
            badge on the right) — only the content source changed, not the
            structure. */}
        <section className="relative overflow-hidden px-[max(1rem,5vw)] pt-[max(7rem,18vh)] pb-[max(4rem,9vh)]">
          <div className="grid items-center gap-[5vw] lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative">
              <p className="mb-6 flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.26em] text-navy-alt/55 uppercase">
                <span className="text-[1rem] text-lime-dark">✦</span>
                {heroKicker}
              </p>
              <h1 className="font-display text-[clamp(2.75rem,5.6vw,5.75rem)] leading-[0.98] tracking-[-0.02em] text-navy-alt whitespace-pre-line">
                {heroHeadline}
              </h1>
              <p className="mt-6 max-w-[27.5rem] text-[clamp(1rem,1.3vw,1.25rem)] leading-[1.55] text-navy-alt/66">
                {heroSubtitle}
              </p>

              <div className="mt-8 flex flex-wrap gap-3.5">
                <Link
                  href="/pilates/classes"
                  className="inline-flex items-center gap-3 rounded-full bg-navy-alt px-7 py-4 text-[1rem] font-semibold text-cream transition hover:brightness-110"
                >
                  Réserver un cours <span>→</span>
                </Link>
                <a
                  href="#planning"
                  className="inline-flex items-center rounded-full border border-navy-alt/25 px-7 py-4 text-[1rem] font-semibold text-navy-alt transition hover:bg-navy-alt/5"
                >
                  Explorer les cours
                </a>
                <a
                  href="tel:+21627314100"
                  className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5.5 py-4 text-[0.9rem] font-bold text-white transition hover:brightness-105"
                >
                  📞 +216 27 314 100
                </a>
                <a
                  href="https://wa.me/21627314100"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-[#25D366] px-5.5 py-4 text-[0.9rem] font-bold text-[#25D366] transition hover:bg-[#25D366]/5"
                >
                  💬 WhatsApp
                </a>
              </div>

              <div className="mt-12 flex flex-wrap gap-10">
                {heroStats.map((st) => (
                  <div key={st.label}>
                    <div className="font-display text-[clamp(2rem,3.2vw,2.875rem)] tracking-[-0.02em] text-navy-alt">
                      {st.big}
                    </div>
                    <div className="mt-1 font-mono text-[0.68rem] tracking-[0.12em] text-navy-alt/50">
                      {st.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-[8%] -right-[6%] h-[62%] w-[62%] rounded-full bg-[radial-gradient(circle,rgba(196,239,63,0.5),transparent_70%)]"
              />
              <video
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster="/prototype-assets/Photos/Reformer_pilates_pose.jpg"
                className="relative z-[1] block aspect-[4/5] w-full rounded-card object-cover"
              >
                <source src="/prototype-assets/Videos/pilates-hero.mp4" type="video/mp4" />
              </video>
              {nextSession && (
                <div className="absolute bottom-[1.9rem] left-[-1.4rem] z-[2] rounded-2xl bg-navy-alt px-5 py-4 text-cream shadow-[0_18px_40px_rgba(12,35,80,0.25)]">
                  <div className="font-mono text-[0.62rem] tracking-[0.18em] text-lime">
                    PROCHAIN · {nextSession.when}
                  </div>
                  <div className="mt-1 text-[0.95rem] font-semibold">
                    {nextSession.className} · {nextSession.timeStr}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="planning" className="bg-cream-alt px-[max(1rem,5vw)] pb-[max(4rem,9vh)] pt-[max(3rem,7vh)]">
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

        <PilatesInstructors
          kicker={instructorsKicker}
          heading={instructorsHeading}
          description={instructorsDesc}
        />

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
      <Footer theme="light" />
    </>
  )
}
