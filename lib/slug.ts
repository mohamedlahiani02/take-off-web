/**
 * Readable URLs without a `slug` column.
 *
 * Products, coaches and tournaments are identified by UUID in the API, but a
 * bare UUID in the address bar is useless to a reader and to search engines.
 * A path segment is therefore `human-readable--<uuid>`: the prefix is decorative
 * and may drift as content is renamed, while the trailing UUID is authoritative.
 */

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

/** Lowercase, accent-free, hyphenated form of a label. */
export function slugify(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Builds the `label--uuid` segment used in public detail URLs. */
export function toSegment(label: string, id: string): string {
  const prefix = slugify(label)
  return prefix ? `${prefix}--${id}` : id
}

/**
 * Extracts the authoritative id from a path segment.
 * Accepts a bare UUID too, so older or hand-typed links keep working.
 */
export function idFromSegment(segment: string): string | null {
  const match = UUID_RE.exec(decodeURIComponent(segment))
  return match ? match[0] : null
}
