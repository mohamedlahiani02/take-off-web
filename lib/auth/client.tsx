'use client'

/**
 * Client-side auth context.
 *
 * Exposes the current user shape (or null) to React components. The session
 * is derived from a server-side cookie — the client context is hydrated from
 * a data-fetching call to GET /api/me (not yet implemented) or from props
 * passed down from a Server Component.
 *
 * For now the context always returns null (unauthenticated). When the API
 * exists, replace the TODO with a useQuery call to /api/me.
 */
import { createContext, useContext, useState } from 'react'
import type { User } from '@/lib/api/types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // TODO: replace with useQuery(() => apiFetch('/v1/me')) once take-off-api exists
  const [user] = useState<User | null>(null)

  return (
    <AuthContext.Provider value={{ user, isLoading: false }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
