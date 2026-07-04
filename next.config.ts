import type { NextConfig } from 'next'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))

const config: NextConfig = {
  turbopack: {
    root: projectRoot,
  },

  images: {
    remotePatterns: [
      {
        // Placeholder — replace with real image CDN host(s) when available
        protocol: 'https',
        hostname: 'media.takeoff.tn',
      },
    ],
  },

  async redirects() {
    return [
      // The root gateway is the entry point — no redirect needed, but we
      // keep this slot open for future locale-based redirects (e.g. /fr).
    ]
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https:; media-src 'self' https:; frame-src https://www.google.com https://maps.google.com; frame-ancestors 'none';",
          },
          // Force HTTPS for two years, including subdomains, and allow preload.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Stop the browser from MIME-sniffing responses away from the declared type.
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Only send the origin (not the full path) on cross-origin navigations.
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Belt-and-braces clickjacking guard alongside CSP frame-ancestors.
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Drop access to powerful features the site never uses.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ]
  },

  // prototype/ exclusion note:
  // The prototype/ directory is never imported by any app code, so webpack
  // ignores it automatically. TypeScript also excludes it via tsconfig.json
  // "exclude": ["prototype"]. No additional webpack rule is needed.
}

export default config
