/**
 * Placeholder API type exports.
 *
 * These will be replaced (or generated) from the OpenAPI spec published by
 * take-off-api. Marked as TODO so they're easy to find.
 *
 * All monetary amounts are in millimes (1 TND = 1000 millimes).
 * All timestamps are ISO-8601 strings with UTC offset.
 */

// TODO: generate from OpenAPI spec
export interface ApiResponse<T> {
  data: T
}

// TODO: generate from OpenAPI spec
export interface User {
  id: string
  email?: string
  name: string
  phone?: string
  role?: string
  walletDt?: number
  points?: number
  tracks?: Array<'padel' | 'pilates'>
  createdAt?: string
}

// TODO: generate from OpenAPI spec
export interface Booking {
  id: string
  slotId: string
  userId: string
  type: 'SHARE' | 'FULL_COURT'
  priceTND: number
  paymentSource: 'WALLET' | 'CARD' | 'PACK'
  status: 'HELD' | 'CONFIRMED' | 'CANCELLED'
  createdAt: string
  holdExpiresAt?: string
}

// TODO: generate from OpenAPI spec
export interface Coach {
  id: string
  slug: string
  name: string
  role: string
  bio: string
  specialties: string[]
  achievements: string[]
  photoUrl?: string
  sport: 'PADEL' | 'PILATES'
}

// TODO: generate from OpenAPI spec
export interface Product {
  id: string
  slug: string
  category: string
  name: string
  description: string
  images: string[]
  brandOwn: boolean
  tags: string[]
  variants: ProductVariant[]
}

// TODO: generate from OpenAPI spec
export interface ProductVariant {
  id: string
  sku: string
  size?: string
  priceTND: number
  stock: number
}

// TODO: generate from OpenAPI spec
export interface ProblemDetail {
  type: string
  title: string
  status: number
  code: string
  detail: string
  traceId?: string
}
