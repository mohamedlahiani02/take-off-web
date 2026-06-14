/**
 * ImageSlot — read-only image container with a branded placeholder state.
 *
 * Inspired by the <image-slot> custom element in prototype/image-slot.js but
 * implemented as a pure React component with no upload capability (v1).
 * Upload functionality will be added in the admin/CMS layer later.
 */
import Image from 'next/image'
import { cn } from '@/lib/cn'

interface ImageSlotProps {
  src?: string | null
  alt: string
  className?: string
  fill?: boolean
  priority?: boolean
  placeholder?: string
}

export function ImageSlot({
  src,
  alt,
  className,
  fill = false,
  priority = false,
  placeholder = 'Image coming soon',
}: ImageSlotProps) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={placeholder}
        className={cn(
          'flex items-center justify-center bg-card-navy border border-white/8',
          'font-mono text-[11px] tracking-[0.22em] text-white/25 uppercase select-none',
          className,
        )}
      >
        {placeholder}
      </div>
    )
  }

  if (fill) {
    return (
      <div className={cn('relative', className)}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      priority={priority}
      className={cn('object-cover', className)}
    />
  )
}
