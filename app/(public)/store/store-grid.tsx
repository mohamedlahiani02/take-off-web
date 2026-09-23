'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { PublicProduct } from '@/lib/api/public'
import { toSegment } from '@/lib/slug'

const CATEGORIES = [
  { key: 'all', label: 'Tout' },
  { key: 'rackets', label: 'Raquettes' },
  { key: 'accessories', label: 'Accessoires' },
  { key: 'padelwear', label: 'Padelwear' },
  { key: 'towels', label: 'Serviettes' },
  { key: 'pilates', label: 'Pilates' },
  { key: 'lifestyle', label: 'Lifestyle' },
] as const

/**
 * Filtering and search over a catalogue that was already rendered on the
 * server, so the full grid is in the initial HTML for crawlers and the
 * interaction stays instant without a round trip.
 *
 * Each card links to the product's own page instead of opening a modal: a
 * product is now addressable, shareable and indexable.
 */
export function StoreGrid({ products }: { products: PublicProduct[] }) {
  const [category, setCategory] = useState<string>('all')
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (p.isActive === false) return false
      if (category !== 'all' && (p.category ?? '').toLowerCase() !== category) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q)
      )
    })
  }, [products, category, query])

  return (
    <>
      {/* Controls: wrap freely on a phone, single row once there is width. */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Catégories"
          className="-mx-[max(1rem,4vw)] flex gap-2 overflow-x-auto px-[max(1rem,4vw)] pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        >
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={category === c.key}
              onClick={() => setCategory(c.key)}
              className={`shrink-0 rounded-full border px-4 py-2 font-mono text-[0.68rem] tracking-[0.12em] transition-colors ${
                category === c.key
                  ? 'border-lime bg-lime text-navy'
                  : 'border-white/15 text-white/65 hover:border-white/35 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <label className="w-full sm:w-auto">
          <span className="sr-only">Rechercher un produit</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="w-full rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-[0.85rem] text-white placeholder-white/35 focus:border-lime/50 focus:outline-none sm:w-[16rem]"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-white/45">
          {products.length === 0
            ? 'Aucun produit en boutique pour le moment.'
            : 'Aucun produit ne correspond à votre recherche.'}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {visible.map((p) => (
            <li key={p.id}>
              <Link
                href={`/store/${toSegment(p.name, p.id)}`}
                className="group block overflow-hidden rounded-card border border-lime/12 bg-card-navy transition-colors hover:border-lime/35"
              >
                <div className="relative aspect-square w-full bg-navy-alt">
                  {p.imageUrls?.[0] ? (
                    <img
                      src={p.imageUrls[0]}
                      alt={p.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center font-mono text-[0.6rem] tracking-[0.18em] text-white/20">
                      PAS DE VISUEL
                    </span>
                  )}
                  {p.tag && (
                    <span className="absolute top-2 left-2 rounded-full bg-navy/85 px-2.5 py-1 font-mono text-[0.55rem] tracking-[0.12em] text-lime">
                      {p.tag}
                    </span>
                  )}
                  {(p.stock ?? 0) <= 0 && (
                    <span className="absolute right-2 bottom-2 rounded-full bg-navy/85 px-2.5 py-1 font-mono text-[0.55rem] tracking-[0.12em] text-white/60">
                      ÉPUISÉ
                    </span>
                  )}
                </div>
                <div className="p-3 sm:p-4">
                  <p className="text-[0.85rem] leading-snug font-medium text-white group-hover:text-lime">
                    {p.name}
                  </p>
                  <p className="mt-1 font-mono text-[0.75rem] text-lime">
                    {typeof p.priceDt === 'number' ? `${p.priceDt.toFixed(3)} DT` : '—'}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
