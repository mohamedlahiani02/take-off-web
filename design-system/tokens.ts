/**
 * Design tokens — frozen from ARCHITECTURE.md §6.
 * These values are the single source of truth. They are consumed by:
 *  - design-system/globals.css  (@theme CSS variables)
 *  - design-system/fonts.ts     (font family names)
 *  - Any component that needs a runtime token value (e.g. canvas drawing).
 */

export const tokens = {
  color: {
    /** Primary dark navy — main background, text on light surfaces */
    navy: '#0a1733',
    /** Slightly lighter navy used for hover states and alt backgrounds */
    navyAlt: '#0c2350',
    /** Card-level navy — slightly more elevated than the page background */
    cardNavy: '#0f1f44',
    /** Brand accent — lime green used for CTAs and highlights */
    lime: '#c4ef3f',
    /** Darker lime used for text on cream and secondary lime elements */
    limeDark: '#6a8a16',
    /** Primary light background — off-white cream for the Pilates track */
    cream: '#f4f5ee',
    /** Slightly warmer cream for alt sections and inputs */
    creamAlt: '#eceadf',
    /** Semantic alias for body text on light backgrounds */
    ink: '#0a1733',
  },

  font: {
    /** Anton — large display headlines, hero type */
    display: 'Anton',
    /** Space Grotesk — body copy, UI labels, navigation */
    body: 'Space Grotesk',
    /** Space Mono — monospaced eyebrows, section numbers, data labels */
    mono: 'Space Mono',
  },

  radius: {
    /** Card border-radius in px */
    card: 18,
    /** Large containers / hero cards */
    large: 22,
    /** Pills — buttons, tags */
    pill: 999,
  },

  motion: {
    /** Signature easing curve for enter/lift transitions */
    lift: 'cubic-bezier(.2,.7,.2,1)',
  },
} as const

export type ColorToken = keyof typeof tokens.color
export type FontToken = keyof typeof tokens.font
