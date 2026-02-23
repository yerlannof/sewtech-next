'use client'

import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { useLocalStorage } from './use-local-storage'
import type { FavoriteItem } from './types'

interface FavoritesContextValue {
  items: FavoriteItem[]
  toggle: (item: FavoriteItem) => void
  isFav: (productId: number) => boolean
  remove: (productId: number) => void
  clear: () => void
  count: number
  isHydrated: boolean
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [items, setItems, isHydrated] = useLocalStorage<FavoriteItem[]>('sewtech-favorites', [])

  const toggle = useCallback(
    (item: FavoriteItem) => {
      setItems((prev) => {
        const exists = prev.some((i) => i.productId === item.productId)
        if (exists) return prev.filter((i) => i.productId !== item.productId)
        return [...prev, item]
      })
    },
    [setItems],
  )

  const isFav = useCallback(
    (productId: number) => items.some((i) => i.productId === productId),
    [items],
  )

  const remove = useCallback(
    (productId: number) => {
      setItems((prev) => prev.filter((i) => i.productId !== productId))
    },
    [setItems],
  )

  const clear = useCallback(() => setItems([]), [setItems])

  return (
    <FavoritesContext.Provider value={{ items, toggle, isFav, remove, clear, count: items.length, isHydrated }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
