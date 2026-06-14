/**
 * next/font/google configuration for all three brand typefaces.
 * Import the exported variables into layout.tsx and apply them to <body>.
 * next/font self-hosts the fonts automatically — no external request at runtime.
 */
import { Anton, Space_Grotesk, Space_Mono } from 'next/font/google'

/** Display font — Anton. Used for hero headlines. */
export const fontDisplay = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

/** Body font — Space Grotesk. Used for UI copy and navigation. */
export const fontBody = Space_Grotesk({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

/** Mono font — Space Mono. Used for eyebrows, section numbers, data. */
export const fontMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})
