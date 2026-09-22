import 'server-only'
import { cookies } from 'next/headers'
import type { User } from '@/lib/api/types'

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('takeoff_user')?.value
  if (!raw) return null
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf-8')
    return JSON.parse(decoded) as User
  } catch {
    return null
  }
}
