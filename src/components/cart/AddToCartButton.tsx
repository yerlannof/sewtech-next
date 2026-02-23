'use client'

import { useCart } from '@/lib/store/cart-context'
import { useState } from 'react'

interface AddToCartButtonProps {
  product: {
    id: number
    name: string
    slug: string
    price: number | null
    imageUrl: string | null
  }
  variant?: 'full' | 'icon'
}

export function AddToCartButton({ product, variant = 'full' }: AddToCartButtonProps) {
  const { add, items } = useCart()
  const [added, setAdded] = useState(false)
  const isInCart = items.some((i) => i.productId === product.id)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    add({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      imageUrl: product.imageUrl,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={`p-2 rounded-lg transition-all ${
          isInCart
            ? 'bg-[#1B4F72] text-white'
            : 'bg-white/90 text-gray-600 hover:bg-[#1B4F72] hover:text-white shadow-sm'
        }`}
        title={isInCart ? 'В корзине' : 'В корзину'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center gap-2 w-full font-medium py-4 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 ${
        added
          ? 'bg-green-500 text-white'
          : 'bg-[#1B4F72] hover:bg-[#163d5a] text-white'
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
      {added ? 'Добавлено!' : isInCart ? 'В корзине' : 'В корзину'}
    </button>
  )
}
