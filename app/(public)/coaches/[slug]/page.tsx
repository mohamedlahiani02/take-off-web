import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCoach, listCoaches } from '@/lib/api/public'
import { idFromSegment, toSegment } from '@/lib/slug'
import { Chips, DetailShell, Fact, Unavailable } from '@/components/public/detail-shell'

interface Params {
  params: Promise<{ slug: string }>
}

const BACK = { backHref: '/coaches', backLabel: 'Tous les coachs' }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = idFromSegment((await params).slug)
  const meta = id ? await getCoach(id) : null
  const coach = meta && meta.kind === 'ok' ? meta.data : null
  if (!coach) return { title: 'Coach — Take Off Club' }
  const full = `${coach.firstName} ${coach.lastName}`
  return {
    title: `${full} — ${coach.roleTitle} · Take Off Club`,
    description: coach.bio?.slice(0, 160) ?? `${full}, ${coach.roleTitle} au Take Off Club.`,
    openGraph: {
      title: full,
      description: coach.roleTitle,
      images: coach.photoUrl ? [coach.photoUrl] : undefined,
      type: 'profile',
    },
  }
}

export default async function CoachPage({ params }: Params) {
  const id = idFromSegment((await params).slug)
  if (!id) notFound()

  const res = await getCoach(id)
  if (res.kind === 'missing') notFound()
  if (res.kind === 'unavailable') return <Unavailable {...BACK} />
  const coach = res.data

  const full = `${coach.firstName} ${coach.lastName}`
  const activity = coach.activity === 'PILATES' ? 'PILATES' : 'PADEL'
  const siblings = (await listCoaches(activity)).filter((c) => c.id !== coach.id).slice(0, 3)

  return (
    <DetailShell eyebrow={coach.roleTitle} title={full} {...BACK}>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        <div className="w-full lg:w-[40%]">
          {coach.photoUrl ? (
            <img
              src={coach.photoUrl}
              alt={full}
              className="aspect-[4/5] w-full rounded-card object-cover"
            />
          ) : (
            <div className="flex aspect-[4/5] w-full items-center justify-center rounded-card bg-card-navy">
              <span className="font-display text-[clamp(2rem,10vw,4rem)] text-white/15">
                {coach.firstName.charAt(0)}
                {coach.lastName.charAt(0)}
              </span>
            </div>
          )}
        </div>

        <div className="w-full lg:w-[60%]">
          {coach.bio && (
            <p className="text-[0.95rem] leading-relaxed text-white/70">{coach.bio}</p>
          )}

          {!!coach.specs?.length && (
            <section className="mt-8">
              <h2 className="mb-3 font-mono text-[0.65rem] tracking-[0.22em] text-white/40 uppercase">
                Spécialités
              </h2>
              <Chips items={coach.specs} />
            </section>
          )}

          {!!coach.achievements?.length && (
            <section className="mt-8">
              <h2 className="mb-3 font-mono text-[0.65rem] tracking-[0.22em] text-white/40 uppercase">
                Palmarès
              </h2>
              <ul className="flex flex-col gap-2">
                {coach.achievements.map((a) => (
                  <li key={a} className="flex gap-3 text-[0.9rem] text-white/75">
                    <span aria-hidden="true" className="text-lime">
                      —
                    </span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-8">
            <Fact label="Discipline" value={activity === 'PILATES' ? 'Pilates' : 'Padel'} />
            <Fact label="Rôle" value={coach.roleTitle} />
          </div>

          <Link
            href={activity === 'PILATES' ? '/pilates/classes' : '/padel/reserve'}
            className="mt-8 inline-block w-full rounded-full bg-lime py-4 text-center text-[0.9rem] font-bold text-navy sm:w-auto sm:px-10"
          >
            {activity === 'PILATES' ? 'Voir les cours' : 'Réserver un court'}
          </Link>
        </div>
      </div>

      {siblings.length > 0 && (
        <section className="mt-14 border-t border-white/10 pt-8">
          <h2 className="mb-5 font-mono text-[0.65rem] tracking-[0.22em] text-white/40 uppercase">
            Autres coachs
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {siblings.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/coaches/${toSegment(`${c.firstName} ${c.lastName}`, c.id)}`}
                  className="block rounded-card bg-card-navy p-4 transition-colors hover:bg-white/10"
                >
                  <p className="text-[0.95rem] font-medium text-white">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="mt-0.5 font-mono text-[0.65rem] tracking-[0.12em] text-white/40">
                    {c.roleTitle}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </DetailShell>
  )
}
