'use client'

import { useState } from 'react'

export interface FaqItem {
  q: string
  a: string
}

/**
 * The prototype's FAQ accordion. Client-side only because of the open/close
 * state; every answer is in the markup from the start, so the content is
 * present for search engines and for a reader with JS disabled.
 */
export function PilatesFaq({
  kicker,
  heading,
  items,
}: {
  kicker: string
  heading: string
  items: FaqItem[]
}) {
  const [open, setOpen] = useState<number | null>(0)
  if (!items.length) return null

  return (
    <section className="bg-cream-alt px-[max(1rem,5vw)] py-[max(4rem,9vh)]">
      <p className="flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.26em] text-navy-alt/50 uppercase">
        <span className="text-[1rem] text-lime-dark">✦</span>
        {kicker}
      </p>
      <h2 className="mt-4 max-w-[20ch] font-display text-[clamp(2.125rem,4.6vw,4.25rem)] leading-none tracking-[-0.02em] text-navy-alt">
        {heading}
      </h2>

      <ul className="mt-10 max-w-[48rem]">
        {items.map((f, i) => {
          const isOpen = open === i
          return (
            <li key={f.q} className="border-b border-navy-alt/12">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-6 py-5 text-left"
              >
                <span className="text-[1.05rem] font-semibold text-navy-alt">{f.q}</span>
                <span
                  aria-hidden="true"
                  className={`flex-none text-[1.5rem] leading-none text-lime-dark transition-transform duration-200 ${
                    isOpen ? 'rotate-45' : ''
                  }`}
                >
                  +
                </span>
              </button>
              <div className={isOpen ? 'pb-5' : 'hidden'}>
                <p className="max-w-[60ch] text-[0.95rem] leading-[1.65] text-navy-alt/70">{f.a}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
