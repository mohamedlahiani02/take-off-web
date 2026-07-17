import type { Metadata } from 'next'
import { fontBody, fontDisplay, fontMono } from '@/design-system/fonts'
import '@/design-system/globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: {
    template: '%s | Take Off Club',
    default: 'Take Off Club — Padel & Pilates · Tunis',
  },
  description:
    'Take Off Club — two courts, one studio. Book padel slots, reserve pilates classes, and shop the pro store in Tunis.',
  metadataBase: new URL(process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://takeoff.tn'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={[
          fontBody.variable,
          fontDisplay.variable,
          fontMono.variable,
          'font-body antialiased',
        ].join(' ')}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
