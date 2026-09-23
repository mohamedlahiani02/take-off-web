import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTournament } from '@/lib/api/public'
import { idFromSegment } from '@/lib/slug'
import { DetailShell, Fact, Unavailable } from '@/components/public/detail-shell'

interface Params {
  params: Promise<{ id: string }>
}

const BACK = { backHref: '/padel/tournaments', backLabel: 'Tous les tournois' }
const TUNIS = 'Africa/Tunis'

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-TN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TUNIS,
  }).format(new Date(iso))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = idFromSegment((await params).id)
  const meta = id ? await getTournament(id) : null
  const t = meta && meta.kind === 'ok' ? meta.data : null
  if (!t) return { title: 'Tournoi — Take Off Club' }
  return {
    title: `${t.title} — Take Off Club`,
    description: t.description?.slice(0, 160) ?? `Tournoi de padel au Take Off Club, Sfax.`,
    openGraph: {
      title: t.title,
      description: t.description?.slice(0, 160) ?? undefined,
      images: t.bannerUrl ? [t.bannerUrl] : undefined,
      type: 'website',
    },
  }
}

export default async function TournamentPage({ params }: Params) {
  const id = idFromSegment((await params).id)
  if (!id) notFound()

  const res = await getTournament(id)
  if (res.kind === 'missing') notFound()
  if (res.kind === 'unavailable') return <Unavailable {...BACK} />
  const t = res.data

  const max = t.maxParticipants ?? 0
  const taken = t.currentRegistrations ?? 0
  const remaining = max > 0 ? Math.max(max - taken, 0) : null
  const deadlinePassed = t.registrationDeadline
    ? new Date(t.registrationDeadline).getTime() < Date.now()
    : false
  const closed = t.status === 'CANCELLED' || t.status === 'COMPLETED' || deadlinePassed || remaining === 0

  return (
    <DetailShell eyebrow={t.category ?? 'Tournoi'} title={t.title} {...BACK}>
      {t.bannerUrl && (
        <img
          src={t.bannerUrl}
          alt={t.title}
          className="mb-8 aspect-[16/9] w-full rounded-card object-cover sm:aspect-[21/9]"
        />
      )}

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        <div className="w-full lg:w-[60%]">
          {t.description && (
            <p className="text-[0.95rem] leading-relaxed whitespace-pre-line text-white/70">
              {t.description}
            </p>
          )}

          <div className="mt-8">
            <Fact label="Début" value={formatDate(t.startsAt)} />
            {t.endsAt && <Fact label="Fin" value={formatDate(t.endsAt)} />}
            {t.format && <Fact label="Format" value={t.format} />}
            {t.prize && <Fact label="Dotation" value={t.prize} />}
            <Fact
              label="Inscription"
              value={
                typeof t.entryFeeDt === 'number' ? `${t.entryFeeDt.toFixed(3)} DT` : '—'
              }
            />
            {t.registrationDeadline && (
              <Fact label="Clôture des inscriptions" value={formatDate(t.registrationDeadline)} />
            )}
          </div>
        </div>

        <aside className="w-full lg:w-[40%]">
          <div className="rounded-card bg-card-navy p-5 sm:p-6">
            <p className="font-mono text-[0.65rem] tracking-[0.22em] text-white/40 uppercase">
              Participants
            </p>
            <p className="mt-2 font-display text-[clamp(1.75rem,7vw,2.75rem)] leading-none text-white">
              {taken}
              {max > 0 && <span className="text-white/35">/{max}</span>}
            </p>
            {remaining !== null && (
              <p className="mt-2 text-[0.85rem] text-white/55">
                {remaining > 0 ? `${remaining} place(s) restante(s)` : 'Complet'}
              </p>
            )}

            {closed ? (
              <p className="mt-6 rounded-[0.5rem] bg-white/5 px-4 py-3 font-mono text-[0.65rem] leading-relaxed tracking-[0.1em] text-white/55">
                {t.status === 'CANCELLED'
                  ? 'CE TOURNOI A ÉTÉ ANNULÉ.'
                  : t.status === 'COMPLETED'
                    ? 'CE TOURNOI EST TERMINÉ.'
                    : remaining === 0
                      ? 'PLUS AUCUNE PLACE DISPONIBLE.'
                      : 'LES INSCRIPTIONS SONT CLOSES.'}
              </p>
            ) : (
              <Link
                href="/padel/tournaments"
                className="mt-6 block w-full rounded-full bg-lime py-4 text-center text-[0.9rem] font-bold text-navy"
              >
                S’inscrire
              </Link>
            )}

            <p className="mt-4 font-mono text-[0.6rem] leading-relaxed tracking-[0.1em] text-white/30">
              TAKE OFF CLUB · SFAX · ROUTE DE L’AÉROPORT KM4
            </p>
          </div>
        </aside>
      </div>
    </DetailShell>
  )
}
