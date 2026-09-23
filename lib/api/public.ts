import 'server-only'
import { apiBase } from '@/lib/auth/session'

/**
 * Server-side reads of the public catalogue, used by the detail pages so the
 * markup (and its metadata) is rendered before it reaches the browser.
 *
 * Every helper returns null on a miss or an outage rather than throwing, so a
 * page can tell "not found" apart from "we could not reach the API" and never
 * renders invented content.
 */

export interface PublicProduct {
  id: string
  name: string
  category?: string
  priceDt?: number
  description?: string | null
  imageUrls?: string[]
  hasSizes?: boolean
  stock?: number
  tag?: string | null
  isActive?: boolean
}

export interface PublicCoach {
  id: string
  firstName: string
  lastName: string
  roleTitle: string
  bio: string
  specs?: string[]
  achievements?: string[]
  photoUrl?: string | null
  activity?: string
}

export interface PublicTournament {
  id: string
  title: string
  description?: string | null
  bannerUrl?: string | null
  format?: string
  category?: string
  startsAt?: string
  endsAt?: string | null
  entryFeeDt?: number
  prize?: string | null
  status?: string
  maxParticipants?: number | null
  registrationDeadline?: string | null
  currentRegistrations?: number
}

/**
 * A miss and an outage are different facts and lead to different pages, so the
 * result is explicit rather than a bare null: `missing` becomes a 404, while
 * `unavailable` shows a retry notice and never claims the content is gone.
 */
export type Fetched<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'missing' }
  | { kind: 'unavailable' }

async function getJson<T>(path: string): Promise<Fetched<T>> {
  const base = apiBase()
  if (!base) return { kind: 'unavailable' }
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { Accept: 'application/json' },
      // Catalogue data changes rarely; revalidate rather than caching forever.
      next: { revalidate: 300 },
    })
    if (res.status === 404 || res.status === 410) return { kind: 'missing' }
    if (!res.ok) return { kind: 'unavailable' }
    return { kind: 'ok', data: (await res.json()) as T }
  } catch {
    return { kind: 'unavailable' }
  }
}

export const getProduct = (id: string) => getJson<PublicProduct>(`/api/v1/products/${id}`)
export const getCoach = (id: string) => getJson<PublicCoach>(`/api/v1/coaches/${id}`)
export const getTournament = (id: string) => getJson<PublicTournament>(`/api/v1/tournaments/${id}`)

/** Coaches for both activities, used to suggest siblings on a coach page. */
export async function listCoaches(activity: 'PADEL' | 'PILATES'): Promise<PublicCoach[]> {
  const res = await getJson<PublicCoach[]>(`/api/v1/coaches?activity=${activity}`)
  return res.kind === 'ok' ? res.data : []
}

export async function listTournaments(): Promise<PublicTournament[]> {
  const res = await getJson<PublicTournament[]>('/api/v1/tournaments')
  return res.kind === 'ok' ? res.data : []
}
