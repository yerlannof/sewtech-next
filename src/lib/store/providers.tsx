'use client'

import type { ReactNode } from 'react'
import { CartProvider } from './cart-context'
import { ComparisonProvider } from './comparison-context'
import { FavoritesProvider } from './favorites-context'

export function StoreProviders({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <ComparisonProvider>
        <FavoritesProvider>{children}</FavoritesProvider>
      </ComparisonProvider>
    </CartProvider>
  )
}
