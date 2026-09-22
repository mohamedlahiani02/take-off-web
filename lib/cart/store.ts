import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PersistStorage } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: string
  variant?: string
  /** Price in millimes (1 TND = 1000 millimes) */
  priceTND: number
  quantity: number
}

interface CartState {
  items: CartItem[]
}

const protoStorage: PersistStorage<CartState> = {
  getItem(name) {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(name)
    if (!raw) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const items: CartItem[] = (parsed as Record<string, unknown>[]).map(it => ({
          id: String(it.productId ?? String(it.name ?? '') + '|' + String(it.size ?? '')),
          name: String(it.name ?? ''),
          variant: it.size ? String(it.size) : undefined,
          priceTND: Math.round((Number(it._raw) || 0) * 1000),
          quantity: Number(it.qty) || 1,
        }))
        return { state: { items }, version: 0 }
      }
      if (parsed && typeof parsed === 'object' && 'state' in (parsed as object)) {
        return parsed as { state: CartState; version: number }
      }
    } catch {}
    return null
  },
  setItem(name, value) {
    if (typeof window === 'undefined') return
    const items = value.state.items
    const raw = items.map(it => ({
      productId: it.id,
      name: it.name,
      sub: '',
      price: (it.priceTND / 1000).toFixed(3) + ' DT',
      _raw: it.priceTND / 1000,
      kind: 'product',
      size: it.variant ?? null,
      cat: '',
      qty: it.quantity,
    }))
    localStorage.setItem(name, JSON.stringify(raw))
  },
  removeItem(name) {
    if (typeof window !== 'undefined') localStorage.removeItem(name)
  },
}

interface CartStore {
  items: CartItem[]
  add: (item: CartItem) => void
  remove: (id: string, variant?: string) => void
  clear: () => void
  /** Returns the total price in millimes */
  getTotal: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({

      items: [],

      add(item) {
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id && i.variant === item.variant)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id && i.variant === item.variant
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i,
              ),
            }
          }
          return { items: [...state.items, item] }
        })
      },

      remove(id, variant?: string) {
        set((state) => ({
          items: state.items.filter((i) => !(i.id === id && i.variant === variant)),
        }))
      },

      clear() {
        set({ items: [] })
      },

      getTotal() {
        return get().items.reduce((sum, item) => sum + item.priceTND * item.quantity, 0)
      },
    }),
    {
      name: 'takeOffCart',
      storage: protoStorage,
    },
  ),
)
