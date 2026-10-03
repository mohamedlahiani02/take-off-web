import 'server-only'
import { cache } from 'react'
import { apiBase, readSignal } from '@/lib/api/base'

/**
 * Editable page content, read on the server so it is in the HTML that reaches
 * crawlers and slow connections.
 *
 * `GET /api/v1/content/{page}` returns a *list* of SiteContent rows. The
 * prototype stored that list straight into state and then read `cms.hero`,
 * which is always undefined on an array — so the store and coaches pages have
 * silently ignored every CMS edit and rendered their hard-coded defaults.
 * Keying by sectionKey here is what makes the admin's edits actually appear.
 */

export type CmsSections = Record<string, Record<string, unknown>>

interface SiteContentRow {
  sectionKey?: string
  content?: Record<string, unknown>
  visible?: boolean
  displayOrder?: number
}

// cache(): generateMetadata and the page both read the same page content, and
// a fetch carrying a signal is not memoized by Next.js on its own.
export const getPageContent = cache(async (page: string): Promise<CmsSections> => {
  const base = apiBase()
  if (!base) return {}
  try {
    const res = await fetch(`${base}/api/v1/content/${encodeURIComponent(page)}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
      signal: readSignal(),
    })
    if (!res.ok) return {}
    const rows = (await res.json()) as SiteContentRow[]
    if (!Array.isArray(rows)) return {}
    const sections: CmsSections = {}
    for (const row of rows) {
      if (row.visible === false || !row.sectionKey) continue
      sections[row.sectionKey] = row.content ?? {}
    }
    return sections
  } catch {
    // Missing or slow CMS content is never fatal: callers fall back to their defaults.
    return {}
  }
})

/** Reads a string field from a CMS section, falling back to the built-in copy. */
export function text(
  sections: CmsSections,
  sectionKey: string,
  field: string,
  fallback: string,
): string {
  const value = sections[sectionKey]?.[field]
  return typeof value === 'string' && value.trim() ? value : fallback
}

/**
 * Reads a repeatable field (bullet lists, steps, testimonials, FAQ entries)
 * from a CMS section, falling back to the built-in copy when the admin has not
 * filled one in. Mirrors the prototype's `(cms.x.items && cms.x.items.length)
 * ? … : default` pattern.
 */
export function list<T>(
  sections: CmsSections,
  sectionKey: string,
  field: string,
  fallback: T[],
): T[] {
  const value = sections[sectionKey]?.[field]
  return Array.isArray(value) && value.length ? (value as T[]) : fallback
}

/** Reads an image URL from a CMS section; null when the admin has not set one. */
export function image(
  sections: CmsSections,
  sectionKey: string,
  field = 'photoUrl',
): string | null {
  const value = sections[sectionKey]?.[field]
  return typeof value === 'string' && value.trim() ? value : null
}
