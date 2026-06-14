/**
 * Tailwind CSS v4 — most configuration now lives in the @theme block inside
 * design-system/globals.css. This file only exists to satisfy tooling that
 * expects a config file and to declare the content sources for purging.
 *
 * With v4's new engine, this file is optional; content globs are handled by
 * the @tailwindcss/postcss plugin scanning the paths below automatically, but
 * we keep it explicit for clarity.
 */
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './design-system/**/*.{ts,tsx}',
  ],
}

export default config
