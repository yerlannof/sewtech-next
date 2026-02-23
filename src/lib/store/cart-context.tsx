'use client'

import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { useLocalStorage } from './use-local-storage'
import type { CartItem } from './types'

interface CartContextValue {
  items: CartItem[]
  add: (item: Omit<CartItem, 'quantity'>) => void
  remove: (productId: number) => void
  updateQty: (productId: number, quantity: number) => void
  clear: () => void
  count: number
  total: number
  isHydrated: boolean
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems, isHydrated] = useLocalStorage<CartItem[]>('sewtech-cart', [])

  const add = useCallback(
    (item: Omit<CartItem, 'quantity'>) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === item.productId)
        if (existing) {
          return prev.map((i) =>
            i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i,
          )
        }
        return [...prev, { ...item, quantity: 1 }]
      })
    },
    [setItems],
  )

  const remove = useCallback(
    (productId: number) => {
      setItems((prev) => prev.filter((i) => i.productId !== productId))
    },
    [setItems],
  )

  const updateQty = useCallback(
    (productId: number, quantity: number) => {
      if (quantity < 1) return
      setItems((prev) =>
        prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
      )
    },
    [setItems],
  )

  const clear = useCallback(() => setItems([]), [setItems])

  const count = items.reduce((sum, i) => sum + i.quantity, 0)
  const total = items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, add, remove, updateQty, clear, count, total, isHydrated }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
