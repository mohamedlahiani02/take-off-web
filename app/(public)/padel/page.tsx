import type { Metadata } from 'next'
import Link from 'next/link'
import { Nav } from '@/components/layout/nav'
import { Footer } from '@/components/layout/footer'
import { getPageContent, list, text } from '@/lib/api/cms'
import { PackCatalogue } from '@/components/pilates/pack-catalogue'
import {
  PadelHero,
  PadelMarquee,
  PadelFormats,
  PadelCta,
  type HeroStat,
  type PadelFormat,
} from '@/components/padel/sections'
import { PadelCoaches, PadelTournaments, PadelShop } from '@/components/padel/data-sections'

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getPageContent('padel')
  const title = text(cms, 'hero', 'headline', 'Padel au Take Off Club')
  const description = text(
    cms,
    'hero',
    'subtitle',
    'Deux courts panoramiques sous les projecteurs, à Sfax. Réservez en quelques secondes.',
  )
  return {
    title: `${title.replace(/\n/g, ' ')} — Take Off Club`,
    description,
    openGraph: { title: title.replace(/\n/g, ' '), description, type: 'website' },
  }
}

export default async function PadelPage() {
  const cms = await getPageContent('padel')

  const heroStats = list<HeroStat>(cms, 'hero', 'stats', [
    { big: '2', label: 'COURTS PRO · VITRAGE PANORAMIQUE' },
    { big: '7/7', label: 'OUVERT 7H — 23H' },
  ])
  const formats = list<PadelFormat>(cms, 'formats', 'cards', [
    {
      n: '01',
      title: 'Réserver un court',
      desc: 'En partagé ou le court entier. Réglé en quelques secondes.',
      href: '/padel/reserve',
    },
    {
      n: '02',
      title: 'Tournois',
      desc: 'Coupes de saison et americanos, ouverts à tous les niveaux.',
      href: '/padel/tournaments',
    },
    {
      n: '03',
      title: 'Coaching',
      desc: 'Séances privées ou en groupe avec nos coachs diplômés.',
      href: '/coaches',
    },
  ])
  const marqueeWords = list<string>(cms, 'marquee', 'words', [
    'PADEL',
    'TOURNOIS',
    'COACHING',
    'LOCATION DE COURT',
    'SESSIONS NOCTURNES',
  ])

  return (
    <>
      <Nav theme="dark" />
      <main className="min-h-screen bg-navy">
        <PadelHero
          kicker={text(cms, 'hero', 'kicker', 'TAKE OFF CLUB — PADEL · SFAX')}
          headline={text(cms, 'hero', 'headline', 'Le court,\nla nuit, à vous.')}
          subtitle={text(
            cms,
            'hero',
            'subtitle',
            'Deux courts pro sous les projecteurs. Rassemblez votre équipe, réservez en quelques secondes.',
          )}
          ctaLabel={text(cms, 'hero', 'ctaLabel', 'Réserver un court')}
          stats={heroStats}
        />

        <PadelMarquee words={marqueeWords} />

        {/* BOOKING — the real court calendar lives at /padel/reserve; this
            block is the way in, not a second implementation of it. */}
        <section id="book" className="bg-navy px-[max(1rem,5vw)] py-[max(4rem,9vh)]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[0.7rem] tracking-[0.26em] text-lime uppercase">
                {text(cms, 'booking', 'kicker', '01 — RÉSERVER')}
              </p>
              <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(2.125rem,4.6vw,4.25rem)] leading-none tracking-[-0.02em] text-white">
                {text(cms, 'booking', 'heading', 'Votre créneau, en direct')}
              </h2>
              <p className="mt-5 max-w-[32rem] text-[0.98rem] leading-[1.6] text-white/65">
                {text(
                  cms,
                  'booking',
                  'subtitle',
                  'Places restantes en temps réel, créneaux de 1h30, 20 DT en partagé ou 80 DT le court entier.',
                )}
              </p>
            </div>
            <Link
              href="/padel/reserve"
              className="inline-flex items-center gap-3 rounded-full bg-lime px-7 py-4 text-[1rem] font-bold text-navy transition hover:brightness-105"
            >
              Voir les disponibilités →
            </Link>
          </div>
        </section>

        <PadelFormats
          kicker={text(cms, 'formats', 'kicker', '02 — JOUER À VOTRE FAÇON')}
          heading={text(cms, 'formats', 'heading', 'Plus qu’un simple match')}
          formats={formats}
        />

        <PadelTournaments
          kicker={text(cms, 'tournaments', 'kicker', '03 — COMPÉTITION')}
          heading={text(cms, 'tournaments', 'heading', 'Coupes, americanos et tournois de saison')}
        />

        <PadelCoaches
          kicker={text(cms, 'coaches', 'kicker', '04 — COACHING')}
          heading={text(cms, 'coaches', 'heading', 'Progressez avec les meilleurs')}
          description={text(
            cms,
            'coaches',
            'description',
            'Des coachs de padel dédiés à votre technique, votre précision et votre confiance en match.',
          )}
        />

        <PadelShop
          kicker={text(cms, 'shop', 'kicker', '05 — BOUTIQUE')}
          heading={text(cms, 'shop', 'heading', 'Équipez-vous')}
        />

        <section className="bg-navy px-[max(1rem,5vw)] py-[max(4rem,9vh)]">
          <p className="font-mono text-[0.7rem] tracking-[0.26em] text-lime uppercase">
            {text(cms, 'packs', 'kicker', '06 — FORFAITS PADEL')}
          </p>
          <h2 className="mt-4 mb-8 font-display text-[clamp(2.125rem,4.6vw,4.25rem)] leading-none tracking-[-0.02em] whitespace-pre-line text-white">
            {text(cms, 'packs', 'heading', 'Jouez plus,\npayez moins')}
          </h2>
          <PackCatalogue activity="PADEL" />
        </section>

        {/* COACHING ENQUIRY — the working form lives on /coaches and posts to
            /api/coaching/inquiry; this routes there rather than standing up a
            second form against the same endpoint. */}
        <section className="bg-card-navy px-[max(1rem,5vw)] py-[max(4rem,9vh)]">
          <div className="max-w-[44rem]">
            <p className="font-mono text-[0.7rem] tracking-[0.26em] text-lime uppercase">
              {text(cms, 'coachingForm', 'kicker', '07 — DEMANDE DE COACHING')}
            </p>
            <h2 className="mt-4 font-display text-[clamp(2.125rem,4.6vw,4.25rem)] leading-none tracking-[-0.02em] text-white">
              {text(cms, 'coachingForm', 'heading', 'Réservez une séance de coaching')}
            </h2>
            <p className="mt-5 text-[0.98rem] leading-[1.65] text-white/65">
              {text(
                cms,
                'coachingForm',
                'description',
                'Séances privées ou en groupe avec nos coachs certifiés. Dites-nous ce qu’il vous faut et vos disponibilités — on vous rappelle sous 24 h.',
              )}
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {list<string>(cms, 'coachingForm', 'bullets', [
                'Séances individuelles',
                'Coaching en groupe (jusqu’à 4)',
                'Analyse vidéo disponible',
              ]).map((b) => (
                <li key={b} className="flex items-center gap-2 text-[0.9rem] text-white/70">
                  <span className="text-lime">✓</span>
                  {b}
                </li>
              ))}
            </ul>
            <Link
              href="/coaches"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-lime px-7 py-4 text-[0.95rem] font-bold text-navy transition hover:brightness-105"
            >
              Demander une séance →
            </Link>
          </div>
        </section>

        <PadelCta
          headline={text(cms, 'cta', 'headline', 'Prêt·e\nà jouer ?')}
          subtitle={text(
            cms,
            'cta',
            'subtitle',
            'Réservez un court en quelques secondes, rejoignez un tournoi, ou prenez une séance avec un pro.',
          )}
          buttonLabel={text(cms, 'cta', 'buttonLabel', 'Réserver votre court')}
        />
      </main>
      <Footer theme="dark" />
    </>
  )
}
