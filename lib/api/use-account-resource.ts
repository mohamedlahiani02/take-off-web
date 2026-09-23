'use client'

import { useEffect, useState } from 'react'

export type ResourceState = 'loading' | 'ready' | 'unauthenticated' | 'error'

interface AccountResource {
  rows: Record<string, unknown>[]
  state: ResourceState
}

/** Accepts either a bare array or a Spring `Page` envelope. */
function toRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[]
  if (payload && typeof payload === 'object' && Array.isArray((payload as { content?: unknown }).content)) {
    return (payload as { content: Record<string, unknown>[] }).content
  }
  return []
}

/**
 * Loads one of the member's account collections through the cookie-authenticated proxy.
 *
 * The state is deliberately four-valued: a 401 surfaces as `unauthenticated` rather than an
 * empty array, so an expired session reads as "please sign in" instead of silently claiming the
 * member has no orders, bookings or packs.
 */
export function useAccountResource(path: string): AccountResource {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [state, setState] = useState<ResourceState>('loading')

  useEffect(() => {
    let active = true
    fetch(path, { credentials: 'include', cache: 'no-store' })
      .then(async (res) => {
        if (!active) return
        if (res.status === 401) {
          setState('unauthenticated')
          return
        }
        if (!res.ok) {
          setState('error')
          return
        }
        setRows(toRows(await res.json()))
        setState('ready')
      })
      .catch(() => {
        if (active) setState('error')
      })
    return () => {
      active = false
    }
  }, [path])

  return { rows, state }
}
