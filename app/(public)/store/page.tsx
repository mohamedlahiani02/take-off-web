import type { Metadata } from 'next'
import { Nav } from '@/components/layout/nav'
import { listProducts } from '@/lib/api/public'
import { getPageContent, text } from '@/lib/api/cms'
import { StoreGrid } from './store-grid'

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getPageContent('store')
  const title = text(cms, 'hero', 'headline', 'La boutique')
  const description = text(
    cms,
    'hero',
    'subtitle',
    'Padel, Pilates et lifestyle. Expédié depuis Sfax.',
  )
  return {
    title: `${title} — Take Off Club`,
    description,
    openGraph: { title, description, type: 'website' },
  }
}

export default async function StorePage() {
  // Both reads are independent; run them together rather than in sequence.
  const [cms, products] = await Promise.all([getPageContent('store'), listProducts()])

  const kicker = text(cms, 'hero', 'kicker', 'LA BOUTIQUE TAKE OFF')
  const headline = text(cms, 'hero', 'headline', 'La boutique')
  const subtitle = text(
    cms,
    'hero',
    'subtitle',
    'Padel, Pilates et lifestyle. Expédié depuis Sfax.',
  )

  return (
    <>
      <Nav theme="dark" />
      <main className="min-h-screen bg-navy">
        {/* Hero — fluid type, fluid gutters, no fixed widths. */}
        <section className="relative overflow-hidden px-[max(1rem,5vw)] pt-[max(7rem,16vh)] pb-[max(3rem,7vh)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_90%_10%,rgba(196,239,63,0.12),transparent_60%)]"
          />
          <div className="relative">
            <p className="mb-4 font-mono text-[0.7rem] tracking-[0.3em] text-lime">{kicker}</p>
            <h1 className="font-display text-[clamp(2.75rem,9vw,8rem)] leading-[0.86] text-white">
              {headline}
              <span className="text-lime">.</span>
            </h1>
            <p className="mt-4 max-w-[34rem] text-[clamp(0.95rem,1.3vw,1.2rem)] leading-relaxed text-white/65">
              {subtitle}
            </p>
          </div>
        </section>

        <section className="px-[max(1rem,5vw)] pb-[max(4rem,9vh)]">
          {products === null ? (
            <p className="rounded-card bg-card-navy px-5 py-8 text-center text-white/55">
              La boutique est momentanément indisponible. Merci de réessayer dans un instant.
            </p>
          ) : (
            <StoreGrid products={products} />
          )}
        </section>
      </main>
    </>
  )
}
