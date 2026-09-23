'use client'

import { useState } from 'react'
import { useCartStore } from '@/lib/cart/store'

const SIZES = ['S', 'M', 'L', 'XL'] as const

/**
 * Writes through the same cart store the drawer and checkout read, so a product
 * added here round-trips to the prototype pages with its kind and identity kept.
 */
export function AddToCart({
  id,
  name,
  priceDt,
  hasSizes,
  inStock,
}: {
  id: string
  name: string
  priceDt: number
  hasSizes: boolean
  inStock: boolean
}) {
  const add = useCartStore((s) => s.add)
  const [size, setSize] = useState<string | undefined>(undefined)
  const [added, setAdded] = useState(false)

  const needsSize = hasSizes && !size

  function onAdd() {
    add({
      id,
      name,
      variant: size,
      priceTND: Math.round(priceDt * 1000),
      quantity: 1,
      kind: 'product',
      meta: { productId: id, name, kind: 'product', size: size ?? null, _raw: priceDt },
    })
    setAdded(true)
    window.setTimeout(() => setAdded(false), 2500)
  }

  if (!inStock) {
    return (
      <p className="mt-8 rounded-card bg-card-navy px-4 py-3 font-mono text-[0.7rem] tracking-[0.14em] text-white/50">
        CE PRODUIT EST ÉPUISÉ
      </p>
    )
  }

  return (
    <div className="mt-8">
      {hasSizes && (
        <fieldset className="mb-5">
          <legend className="mb-2 font-mono text-[0.65rem] tracking-[0.22em] text-white/40 uppercase">
            Taille
          </legend>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={size === s}
                onClick={() => setSize(s)}
                className={`min-w-[3rem] rounded-full border px-4 py-2 text-[0.8rem] transition-colors ${
                  size === s
                    ? 'border-lime bg-lime text-navy'
                    : 'border-white/20 text-white/70 hover:border-white/40'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <button
        type="button"
        onClick={onAdd}
        disabled={needsSize}
        className="w-full rounded-full bg-lime py-4 text-[0.9rem] font-bold text-navy disabled:opacity-40 sm:w-auto sm:px-10"
      >
        {added ? 'Ajouté ✓' : 'Ajouter au panier'}
      </button>

      {needsSize && (
        <p className="mt-2 font-mono text-[0.65rem] tracking-[0.12em] text-white/40">
          CHOISISSEZ UNE TAILLE
        </p>
      )}
    </div>
  )
}
