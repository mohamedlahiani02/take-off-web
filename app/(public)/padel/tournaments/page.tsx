import type { Metadata } from 'next'
import Link from 'next/link'
import { Nav } from '@/components/layout/nav'
import { listTournaments, type PublicTournament } from '@/lib/api/public'
import { getPageContent, text } from '@/lib/api/cms'
import { toSegment } from '@/lib/slug'
import { clubClock, DAYS_EN, MONTHS_EN, dowOf, parseKey } from '@/lib/club-time'

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getPageContent('padel')
  const title = text(cms, 'tournaments', 'heading', 'Tournois')
  const description = text(
    cms,
    'tournaments',
    'subtitle',
    'Coupes, americanos et tournois de saison au Take Off Club, Sfax.',
  )
  return {
    title: `${title} — Take Off Club`,
    description,
    openGraph: { title, description, type: 'website' },
  }
}

/** Club-time date, so a tournament does not shift a day for a foreign browser. */
function whenLabel(iso?: string): string {
  if (!iso) return '—'
  const { dateStr, timeStr } = clubClock(iso)
  const p = parseKey(dateStr)
  return `${DAYS_EN[dowOf(dateStr)]} ${p.d} ${MONTHS_EN[p.m]} · ${timeStr}`
}

function Card({ t }: { t: PublicTournament }) {
  const max = t.maxParticipants ?? 0
  const taken = t.currentRegistrations ?? 0
  const remaining = max > 0 ? Math.max(max - taken, 0) : null
  // TournamentStatus is DRAFT | PUBLISHED | REGISTRATION_OPEN |
  // REGISTRATION_CLOSED | ONGOING | FINISHED. There is no cancelled state, so
  // do not invent one: registration closes on the status, the deadline, or a
  // full field.
  const closed =
    t.status === 'REGISTRATION_CLOSED' ||
    t.status === 'ONGOING' ||
    t.status === 'FINISHED' ||
    remaining === 0 ||
    (t.registrationDeadline ? new Date(t.registrationDeadline).getTime() < Date.now() : false)

  return (
    <li>
      <Link
        href={`/padel/tournaments/${toSegment(t.title, t.id)}`}
        className="group flex h-full flex-col overflow-hidden rounded-card border border-lime/20 bg-card-navy transition-colors hover:border-lime/50"
      >
        {t.bannerUrl && (
          <img
            src={t.bannerUrl}
            alt={t.title}
            loading="lazy"
            className="aspect-[16/9] w-full object-cover"
          />
        )}
        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-lime px-3 py-1 font-mono text-[0.58rem] font-bold tracking-[0.1em] text-navy">
              {whenLabel(t.startsAt)}
            </span>
            {t.status === 'FINISHED' && (
              <span className="rounded-full border border-white/25 px-2.5 py-1 font-mono text-[0.55rem] tracking-[0.1em] text-white/60">
                TERMINÉ
              </span>
            )}
          </div>

          <div>
            <h2 className="font-display text-[1.35rem] leading-tight text-white group-hover:text-lime">
              {t.title}
            </h2>
            {t.format && (
              <p className="mt-1 font-mono text-[0.6rem] tracking-[0.12em] text-white/45">
                {t.format}
              </p>
            )}
          </div>

          {t.prize && (
            <p className="text-[0.82rem] text-white/70">
              <span className="text-lime">Dotation :</span> {t.prize}
            </p>
          )}

          <div className="mt-auto">
            <div className="mb-1.5 flex justify-between font-mono text-[0.62rem] tracking-[0.08em] text-white/55">
              <span>
                {taken}
                {max > 0 && ` / ${max} inscrits`}
              </span>
              <span>
                {closed
                  ? t.status === 'FINISHED'
                    ? 'Terminé'
                    : 'Clos'
                  : remaining !== null
                    ? `${remaining} place(s)`
                    : 'Ouvert'}
              </span>
            </div>
            {max > 0 && (
              <div className="h-[0.3rem] overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-lime"
                  style={{ width: `${Math.min(Math.round((taken / max) * 100), 100)}%` }}
                />
              </div>
            )}
            <p className="mt-3 font-mono text-[0.6rem] tracking-[0.14em] text-lime">
              VOIR LE TOURNOI →
            </p>
          </div>
        </div>
      </Link>
    </li>
  )
}

export default async function TournamentsPage() {
  const [cms, tournaments] = await Promise.all([getPageContent('padel'), listTournaments()])

  const kicker = text(cms, 'tournaments', 'kicker', '04 — COMPETE')
  const heading = text(cms, 'tournaments', 'heading', 'Cups, americanos & seasonal cups')

  // Drafts never reach this endpoint. Finished editions stay listed below, so a
  // member can still find the tournament they played.
  const now = Date.now()
  const upcoming = tournaments.filter((t) => !t.startsAt || new Date(t.startsAt).getTime() >= now)
  const past = tournaments.filter((t) => t.startsAt && new Date(t.startsAt).getTime() < now)

  return (
    <>
      <Nav theme="dark" />
      <main className="min-h-screen bg-navy">
        <section className="relative overflow-hidden px-[max(1rem,5vw)] pt-[max(7rem,16vh)] pb-[max(2rem,5vh)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_88%_12%,rgba(196,239,63,0.12),transparent_60%)]"
          />
          <div className="relative">
            <p className="mb-4 font-mono text-[0.7rem] tracking-[0.3em] text-lime">{kicker}</p>
            <h1 className="max-w-[54rem] font-display text-[clamp(2.25rem,7vw,5.5rem)] leading-[0.9] text-white">
              {heading}
            </h1>
          </div>
        </section>

        <section className="px-[max(1rem,5vw)] pb-[max(4rem,9vh)]">
          {tournaments.length === 0 ? (
            <p className="rounded-card bg-card-navy px-5 py-8 text-center text-white/55">
              Aucun tournoi programmé pour le moment. Revenez bientôt.
            </p>
          ) : (
            <>
              {upcoming.length > 0 && (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((t) => (
                    <Card key={t.id} t={t} />
                  ))}
                </ul>
              )}

              {past.length > 0 && (
                <div className="mt-12 border-t border-white/10 pt-8">
                  <h2 className="mb-5 font-mono text-[0.65rem] tracking-[0.26em] text-white/40 uppercase">
                    Éditions passées
                  </h2>
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {past.map((t) => (
                      <Card key={t.id} t={t} />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </>
  )
}
