'use client'

import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { useLocalStorage } from './use-local-storage'
import type { ComparisonItem } from './types'

const MAX_ITEMS = 4

interface ComparisonContextValue {
  items: ComparisonItem[]
  add: (item: ComparisonItem) => void
  remove: (productId: number) => void
  isIn: (productId: number) => boolean
  clear: () => void
  count: number
  isFull: boolean
  isHydrated: boolean
}

const ComparisonContext = createContext<ComparisonContextValue | null>(null)

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [items, setItems, isHydrated] = useLocalStorage<ComparisonItem[]>('sewtech-compare', [])

  const add = useCallback(
    (item: ComparisonItem) => {
      setItems((prev) => {
        if (prev.length >= MAX_ITEMS) return prev
        if (prev.some((i) => i.productId === item.productId)) return prev
        return [...prev, item]
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

  const isIn = useCallback(
    (productId: number) => items.some((i) => i.productId === productId),
    [items],
  )

  const clear = useCallback(() => setItems([]), [setItems])

  return (
    <ComparisonContext.Provider
      value={{ items, add, remove, isIn, clear, count: items.length, isFull: items.length >= MAX_ITEMS, isHydrated }}
    >
      {children}
    </ComparisonContext.Provider>
  )
}

export function useComparison() {
  const ctx = useContext(ComparisonContext)
  if (!ctx) throw new Error('useComparison must be used within ComparisonProvider')
  return ctx
}
