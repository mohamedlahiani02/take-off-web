import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProduct } from '@/lib/api/public'
import { idFromSegment } from '@/lib/slug'
import { DetailShell, Fact, Unavailable } from '@/components/public/detail-shell'
import { AddToCart } from './add-to-cart'

interface Params {
  params: Promise<{ productSlug: string }>
}

const BACK = { backHref: '/store', backLabel: 'Retour à la boutique' }

function price(dt?: number) {
  return typeof dt === 'number' ? `${dt.toFixed(3)} DT` : '—'
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = idFromSegment((await params).productSlug)
  const meta = id ? await getProduct(id) : null
  const product = meta && meta.kind === 'ok' ? meta.data : null
  if (!product) return { title: 'Produit — Take Off Club' }
  return {
    title: `${product.name} — Take Off Club`,
    description: product.description?.slice(0, 160) ?? `${product.name}, disponible à la boutique du club.`,
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 160) ?? undefined,
      images: product.imageUrls?.length ? [product.imageUrls[0]!] : undefined,
      type: 'website',
    },
  }
}

export default async function ProductPage({ params }: Params) {
  const segment = (await params).productSlug
  const id = idFromSegment(segment)
  if (!id) notFound()

  const res = await getProduct(id)
  // Only a reachable API can say "gone"; an outage must not read as a 404.
  if (res.kind === 'missing') notFound()
  if (res.kind === 'unavailable') return <Unavailable {...BACK} />
  const product = res.data
  if (product.isActive === false) notFound()

  const images = product.imageUrls ?? []

  return (
    <DetailShell eyebrow={product.category ?? 'Boutique'} title={product.name} {...BACK}>
      {/* Single column on phones; the gallery moves beside the details once there is width. */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        <div className="w-full lg:w-[55%]">
          {images.length > 0 ? (
            <div className="flex flex-col gap-3">
                <img
                src={images[0]}
                alt={product.name}
                className="aspect-square w-full rounded-card object-cover"
              />
              {images.length > 1 && (
                <ul className="grid grid-cols-4 gap-2">
                  {images.slice(1, 5).map((src, i) => (
                    <li key={src}>
                                <img
                        src={src}
                        alt={`${product.name} — vue ${i + 2}`}
                        className="aspect-square w-full rounded-[0.5rem] object-cover"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-card bg-card-navy">
              <span className="font-mono text-[0.7rem] tracking-[0.2em] text-white/30">
                PAS DE VISUEL
              </span>
            </div>
          )}
        </div>

        <div className="w-full lg:w-[45%]">
          <p className="font-display text-[clamp(1.75rem,6vw,2.5rem)] leading-none text-lime">
            {price(product.priceDt)}
          </p>

          {product.description && (
            <p className="mt-5 text-[0.95rem] leading-relaxed text-white/70">
              {product.description}
            </p>
          )}

          <div className="mt-7">
            <Fact label="Catégorie" value={product.category ?? '—'} />
            {product.tag && <Fact label="Étiquette" value={product.tag} />}
            <Fact
              label="Disponibilité"
              value={
                (product.stock ?? 0) > 0 ? (
                  <span className="text-lime">En stock</span>
                ) : (
                  <span className="text-white/50">Épuisé</span>
                )
              }
            />
          </div>

          <AddToCart
            id={product.id}
            name={product.name}
            priceDt={product.priceDt ?? 0}
            hasSizes={!!product.hasSizes}
            inStock={(product.stock ?? 0) > 0}
          />
        </div>
      </div>
    </DetailShell>
  )
}
