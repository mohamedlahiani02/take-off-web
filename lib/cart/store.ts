import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: string
  variant?: string
  /** Price in millimes (1 TND = 1000 millimes) */
  priceTND: number
  quantity: number
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
    },
  ),
)
