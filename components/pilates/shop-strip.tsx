import Link from 'next/link'
import { listProducts, type PublicProduct } from '@/lib/api/public'
import { toSegment } from '@/lib/slug'

/** Studio essentials the club actually sells — pilates-leaning categories
 *  first, then whatever else is in stock, so the strip is never padded out
 *  with invented products. */
function pilatesFirst(products: PublicProduct[]): PublicProduct[] {
  const wanted = /pilates|sock|chaussette|towel|serviette|band|élastique|elastique|tapis|mat|lifestyle/i
  const scored = products.filter((p) => p.isActive !== false)
  const preferred = scored.filter((p) => wanted.test(`${p.category ?? ''} ${p.name}`))
  return (preferred.length ? preferred : scored).slice(0, 4)
}

/**
 * The prototype's SHOP strip on the pilates page. Real catalogue data only:
 * when the catalogue cannot be read (listProducts returns null) or is empty,
 * the section renders nothing rather than an empty shelf.
 */
export async function PilatesShopStrip({
  kicker,
  heading,
}: {
  kicker: string
  heading: string
}) {
  const products = await listProducts()
  if (!products) return null
  const items = pilatesFirst(products)
  if (!items.length) return null

  return (
    <section className="bg-cream px-[max(1rem,5vw)] py-[max(4rem,9vh)]">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.26em] text-navy-alt/50 uppercase">
            <span className="text-[1rem] text-lime-dark">✦</span>
            {kicker}
          </p>
          <h2 className="mt-4 font-display text-[clamp(2.125rem,4.6vw,4.25rem)] leading-none tracking-[-0.02em] text-navy-alt">
            {heading}
          </h2>
        </div>
        <Link
          href="/store"
          className="rounded-full border border-navy-alt/25 px-5 py-2.5 font-mono text-[0.65rem] tracking-[0.1em] text-navy-alt"
        >
          Toute la boutique →
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((p) => (
          <li key={p.id}>
            <Link href={`/store/${toSegment(p.name, p.id)}`} className="group block">
              <div className="relative aspect-square w-full overflow-hidden rounded-card bg-cream-alt">
                {p.imageUrls?.[0] ? (
                  <img
                    src={p.imageUrls[0]}
                    alt={p.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center font-mono text-[0.6rem] tracking-[0.14em] text-navy-alt/30">
                    TAKE OFF
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-[0.95rem] leading-tight font-semibold text-navy-alt">
                {p.name}
              </h3>
              {typeof p.priceDt === 'number' && (
                <div className="mt-1 font-mono text-[0.72rem] tracking-[0.06em] text-lime-dark">
                  {p.priceDt.toFixed(3)} DT
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
