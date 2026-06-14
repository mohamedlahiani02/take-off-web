import { cn } from '@/lib/cn'

type PillVariant = 'lime' | 'navy' | 'ghost-dark' | 'ghost-light'

interface PillProps {
  children: React.ReactNode
  variant?: PillVariant
  className?: string
}

const variantClasses: Record<PillVariant, string> = {
  lime: 'bg-lime text-navy',
  navy: 'bg-navy text-cream',
  'ghost-dark': 'border border-white/20 text-white/70',
  'ghost-light': 'border border-navy/20 text-navy/70',
}

export function Pill({ children, variant = 'lime', className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-4 py-1.5',
        'font-mono text-[11px] tracking-[0.22em] uppercase whitespace-nowrap',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
