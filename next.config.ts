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

  // prototype/ exclusion note:
  // The prototype/ directory is never imported by any app code, so webpack
  // ignores it automatically. TypeScript also excludes it via tsconfig.json
  // "exclude": ["prototype"]. No additional webpack rule is needed.
}

export default config
