'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { User } from '@/lib/api/types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  /** Re-reads the session from the server and updates every consumer. */
  refresh: () => Promise<User | null>
  /** Drops the cached identity without waiting for a round trip. */
  clear: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: false,
  refresh: async () => null,
  clear: () => {},
})

async function fetchSession(): Promise<User | null> {
  try {
    const res = await fetch('/api/me', { credentials: 'include', cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as User
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Callers must await this after signing in or out. The provider only loaded once on mount, so
   * a successful login left every consumer still holding the cached "signed out" value — which
   * bounced members straight back to /login when they walked from the cart into checkout.
   */
  const refresh = useCallback(async () => {
    const next = await fetchSession()
    setUser(next)
    setIsLoading(false)
    return next
  }, [])

  const clear = useCallback(() => {
    setUser(null)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    fetchSession()
      .then((u) => {
        if (active) setUser(u)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, refresh, clear }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
