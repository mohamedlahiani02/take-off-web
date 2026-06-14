/**
 * Conditional Sentry initialisation.
 *
 * Sentry is only initialised when NEXT_PUBLIC_SENTRY_DSN is set, so local
 * development remains noise-free by default. The @sentry/nextjs SDK also
 * handles automatic instrumentation for Next.js App Router routes.
 *
 * For full Next.js SDK setup (sentry.client.config.ts / sentry.server.config.ts),
 * see the Sentry Next.js docs and set SENTRY_AUTH_TOKEN for source map uploads.
 */
import * as Sentry from '@sentry/nextjs'

let initialised = false

export function initSentry() {
  if (initialised) return
  const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']
  if (!dsn) return

  Sentry.init({
    dsn,
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 0,
    environment: process.env['NODE_ENV'],
    // Source maps are uploaded at build time via SENTRY_AUTH_TOKEN
  })

  initialised = true
}
