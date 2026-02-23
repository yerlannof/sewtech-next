'use client'

import { FavoriteButton } from '@/components/favorites/FavoriteButton'
import { CompareButton } from '@/components/comparison/CompareButton'
import { AddToCartButton } from '@/components/cart/AddToCartButton'

interface ProductCardActionsProps {
  product: {
    id: number
    name: string
    slug: string
    price: number | null
    imageUrl: string | null
  }
}

export function ProductCardActions({ product }: ProductCardActionsProps) {
  return (
    <>
      {/* Favorite button — top right */}
      <div className="absolute top-2 right-2 z-10">
        <FavoriteButton product={product} />
      </div>

      {/* Compare + Cart — bottom right, visible on hover */}
      <div className="absolute bottom-[calc(100%-3.5rem)] right-2 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <CompareButton product={product} />
        <AddToCartButton product={product} variant="icon" />
      </div>
    </>
  )
}
