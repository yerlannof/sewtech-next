'use client'

import { AddToCartButton } from '@/components/cart/AddToCartButton'
import { FavoriteButton } from '@/components/favorites/FavoriteButton'
import { CompareButton } from '@/components/comparison/CompareButton'

interface ProductActionsProps {
  product: {
    id: number
    name: string
    slug: string
    price: number | null
    imageUrl: string | null
  }
}

export function ProductActions({ product }: ProductActionsProps) {
  return (
    <div className="space-y-3">
      <AddToCartButton product={product} />
      <div className="flex items-center gap-4 justify-center">
        <FavoriteButton product={product} variant="full" />
        <CompareButton product={product} variant="full" />
      </div>
    </div>
  )
}
