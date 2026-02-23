'use client'

import { useFavorites } from '@/lib/store/favorites-context'

interface FavoriteButtonProps {
  product: {
    id: number
    name: string
    slug: string
    price: number | null
    imageUrl: string | null
  }
  variant?: 'icon' | 'full'
}

export function FavoriteButton({ product, variant = 'icon' }: FavoriteButtonProps) {
  const { toggle, isFav } = useFavorites()
  const active = isFav(product.id)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggle({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      imageUrl: product.imageUrl,
    })
  }

  if (variant === 'full') {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 text-sm font-medium transition-colors ${
          active ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill={active ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        {active ? 'В избранном' : 'В избранное'}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`p-2 rounded-lg transition-all ${
        active
          ? 'bg-red-50 text-red-500'
          : 'bg-white/90 text-gray-400 hover:text-red-500 shadow-sm'
      }`}
      title={active ? 'Убрать из избранного' : 'В избранное'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill={active ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  )
}
