import type { Metadata } from 'next'
import Link from 'next/link'
import { Nav } from '@/components/layout/nav'
import { Footer } from '@/components/layout/footer'
import { PilatesInstructors } from '@/components/pilates/instructors'
import { PilatesApproach } from '@/components/pilates/approach'
import { PilatesClassTypes, type PilatesClassType } from '@/components/pilates/class-types'
import { PilatesJourney, type JourneyStep } from '@/components/pilates/journey'
import { PilatesStories, type Story } from '@/components/pilates/stories'
import { PilatesShopStrip } from '@/components/pilates/shop-strip'
import { PilatesFaq, type FaqItem } from '@/components/pilates/faq'
import { CoachingForm } from '@/app/(public)/coaches/coaching-form'
import { getPageContent, list, text } from '@/lib/api/cms'
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

  // Sections below the schedule. Copy is CMS-overridable; the defaults are
  // the prototype's own, translated.
  const approachPoints = list<string>(cms, 'approach', 'points', [
    'Adapté à chaque niveau et à chaque corps',
    'Petits groupes, vraie attention',
    'Reformer, tapis, duo et privé',
  ])
  const classTypes = list<PilatesClassType>(cms, 'classes', 'items', [
    {
      name: 'Reformer Flow',
      level: 'Tous niveaux',
      dur: '50 min',
      desc: 'Un enchaînement fluide sur reformer : gainage, mobilité et contrôle.',
    },
    {
      name: 'Mat Foundations',
      level: 'Débutant',
      dur: '50 min',
      desc: 'Les bases du pilates au sol, guidées mouvement par mouvement.',
    },
    {
      name: 'Sculpt & Tone',
      level: 'Intermédiaire',
      dur: '50 min',
      desc: 'Plus de résistance, plus de rythme — pour renforcer en profondeur.',
    },
  ])
  const journeySteps = list<JourneyStep>(cms, 'journey', 'steps', [
    {
      n: '01',
      title: 'Choisissez votre cours',
      desc: 'Reformer, tapis, sculpt — filtrez selon votre niveau et vos horaires.',
    },
    {
      n: '02',
      title: 'Réservez votre place',
      desc: 'Un créneau qui s’adapte à votre semaine. Places restantes en direct.',
    },
    {
      n: '03',
      title: 'Venez respirer',
      desc: 'Arrivez, respirez, bougez. On s’occupe du reste — matériel compris.',
    },
  ])
  const stories = list<Story>(cms, 'testimonials', 'items', [
    {
      text: 'J’arrivais raide et stressée. Six semaines plus tard, je me tiens plus droite, je dors mieux, et j’attends le lundi avec impatience.',
      name: 'Amira B.',
      tag: 'MEMBRE · 8 MOIS',
    },
    {
      text: 'Les instructrices remarquent tout. Chaque consigne est pour mon corps — je ne me suis jamais sentie aussi forte ni aussi accompagnée.',
      name: 'Khalil R.',
      tag: 'MEMBRE · 1 AN',
    },
    {
      text: 'Le reformer, c’est mon bouton reset. L’esprit calme, le centre solide, et une communauté qui me ressemble.',
      name: 'Sonia M.',
      tag: 'MEMBRE · 4 MOIS',
    },
  ])
  const faqs = list<FaqItem>(cms, 'faq', 'items', [
    {
      q: 'Faut-il de l’expérience pour commencer ?',
      a: 'Aucune. Les cours Mat Foundations et les reformers tous niveaux sont pensés pour débuter — l’instructeur vous guide sur chaque mouvement, à votre rythme.',
    },
    {
      q: 'Que faut-il apporter ?',
      a: 'Une tenue confortable et des chaussettes antidérapantes (disponibles à la boutique). Reformers, tapis et accessoires sont fournis.',
    },
    {
      q: 'Comment fonctionnent les réservations ?',
      a: 'Choisissez un créneau dans le planning et réservez votre place. Les places sont limitées par cours : mieux vaut réserver tôt.',
    },
    {
      q: 'Puis-je suspendre ou partager mon forfait ?',
      a: 'Les forfaits sont valables 3 mois et peuvent être suspendus une fois. Les membres illimités peuvent inviter une personne par mois.',
    },
    {
      q: 'Y a-t-il un parking au studio ?',
      a: 'Oui — parking membres gratuit sur place, et les courts de padel sont juste à côté si vous voulez enchaîner.',
    },
  ])

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

        <PilatesApproach
          kicker={text(cms, 'approach', 'kicker', 'NOTRE APPROCHE')}
          heading={text(cms, 'approach', 'heading', 'Un pilates pour tous les corps')}
          body={text(
            cms,
            'approach',
            'body',
            'Aucun corps ne bouge de la même façon. Nos instructeurs adaptent chaque séance à votre niveau — première séance ou centième — pour que vous avanciez avec contrôle, confiance et aisance.',
          )}
          points={approachPoints}
          photo1="/prototype-assets/Photos/Pilates_reformer.jpg"
          photo2="/prototype-assets/Photos/Mat_pilates.jpg"
        />

        <PilatesClassTypes
          kicker={text(cms, 'classes', 'kicker', 'NOS COURS')}
          heading={text(cms, 'classes', 'heading', 'Trouvez le cours qui vous fait du bien')}
          items={classTypes}
        />

        <PilatesJourney
          kicker={text(cms, 'journey', 'kicker', 'COMMENT ÇA MARCHE')}
          heading={text(cms, 'journey', 'heading', 'De la réservation au tapis')}
          steps={journeySteps}
        />

        <PilatesInstructors
          kicker={instructorsKicker}
          heading={instructorsHeading}
          description={instructorsDesc}
        />

        <PilatesStories
          kicker={text(cms, 'testimonials', 'kicker', 'TÉMOIGNAGES')}
          heading={text(cms, 'testimonials', 'heading', 'Elles et ils en parlent')}
          stories={stories}
        />

        <section className="px-[max(1rem,5vw)] py-[max(4rem,9vh)]">
          <p className="mb-2 font-mono text-[0.65rem] tracking-[0.24em] text-lime-dark">{packsKicker}</p>
          <h2 className="mb-8 font-display text-[clamp(1.75rem,4vw,3rem)] text-navy-alt">{packsHeading}</h2>
          <PackCatalogue />
        </section>

        <PilatesShopStrip
          kicker={text(cms, 'shop', 'kicker', 'BOUTIQUE')}
          heading={text(cms, 'shop', 'heading', 'L’essentiel du studio')}
        />

        <PilatesFaq
          kicker={text(cms, 'faq', 'kicker', 'QUESTIONS')}
          heading={text(cms, 'faq', 'heading', 'Ce qu’on nous demande le plus')}
          items={faqs}
        />

        {/* PRIVATE SESSION — the same single CoachingForm the coaches and
            padel pages use, embedded here as the prototype had it, so an
            enquiry never costs a page change. One form, one endpoint. */}
        <section id="seance-privee" className="bg-cream px-[max(1rem,5vw)] py-[max(4rem,9vh)]">
          <div className="max-w-[44rem]">
            <p className="flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.26em] text-navy-alt/50 uppercase">
              <span className="text-[1rem] text-lime-dark">✦</span>
              {text(cms, 'privateSession', 'kicker', 'SÉANCE PRIVÉE')}
            </p>
            <h2 className="mt-4 font-display text-[clamp(2.125rem,4.6vw,4.25rem)] leading-none tracking-[-0.02em] text-navy-alt">
              {text(cms, 'privateSession', 'heading', 'Envie d’un accompagnement rien qu’à vous ?')}
            </h2>
            <p className="mt-5 max-w-[34rem] text-[0.98rem] leading-[1.65] text-navy-alt/70">
              {text(
                cms,
                'privateSession',
                'subtitle',
                'Duo ou individuel, sur reformer ou au tapis : dites-nous ce que vous cherchez et vos disponibilités, un instructeur vous rappelle.',
              )}
            </p>
          </div>
          <div className="mt-9 max-w-[52rem]">
            <CoachingForm theme="light" />
          </div>
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
