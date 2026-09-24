import type { Metadata } from 'next'
import { Nav } from '@/components/layout/nav'
import { CourtCalendar } from './court-calendar'

export const metadata: Metadata = {
  title: 'Réserver un court — Take Off Club',
  description:
    'Réservez un court de padel au Take Off Club, Sfax. Deux courts, créneaux de 1h30, 20 DT en partagé ou 80 DT le court entier.',
  openGraph: {
    title: 'Réserver un court — Take Off Club',
    description: 'Deux courts · 1h30 · 20 DT partagé ou 80 DT court entier.',
    type: 'website',
  },
}

export default function ReservePage() {
  return (
    <>
      <Nav theme="dark" />
      <main className="min-h-screen bg-navy pb-[max(4rem,9vh)]">
        <section className="px-[max(1rem,5vw)] pt-[max(7rem,16vh)] pb-[max(2rem,5vh)]">
          <p className="mb-4 font-mono text-[0.7rem] tracking-[0.3em] text-lime">
            01 — BOOK YOUR SLOT
          </p>
          <h1 className="font-display text-[clamp(2.5rem,8vw,5.5rem)] leading-[0.9] text-white">
            Reserve a court
          </h1>
          <p className="mt-4 max-w-[30rem] font-mono text-[0.75rem] leading-loose tracking-[0.06em] text-white/50">
            Two courts · 1h30 fixed · 20 DT share or 80 DT full
          </p>
        </section>

        <section className="px-[max(1rem,5vw)]">
          <CourtCalendar />
        </section>
      </main>
    </>
  )
}
