import 'server-only'
import { apiBase } from '@/lib/auth/session'

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

export async function getPageContent(page: string): Promise<CmsSections> {
  const base = apiBase()
  if (!base) return {}
  try {
    const res = await fetch(`${base}/api/v1/content/${encodeURIComponent(page)}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
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
    // Missing CMS content is never fatal: callers fall back to their defaults.
    return {}
  }
}

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

/** Reads an image URL from a CMS section; null when the admin has not set one. */
export function image(
  sections: CmsSections,
  sectionKey: string,
  field = 'photoUrl',
): string | null {
  const value = sections[sectionKey]?.[field]
  return typeof value === 'string' && value.trim() ? value : null
}
