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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https:; media-src 'self' https:; frame-ancestors 'none';",
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
