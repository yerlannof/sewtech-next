'use client'

import { useComparison } from '@/lib/store/comparison-context'

interface CompareButtonProps {
  product: {
    id: number
    name: string
    slug: string
    imageUrl: string | null
  }
  variant?: 'icon' | 'full'
}

export function CompareButton({ product, variant = 'icon' }: CompareButtonProps) {
  const { add, remove, isIn, isFull } = useComparison()
  const active = isIn(product.id)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (active) {
      remove(product.id)
    } else if (!isFull) {
      add({
        productId: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl: product.imageUrl,
      })
    }
  }

  if (variant === 'full') {
    return (
      <button
        onClick={handleClick}
        disabled={!active && isFull}
        className={`flex items-center gap-2 text-sm font-medium transition-colors ${
          active ? 'text-[#1B4F72]' : isFull ? 'text-gray-300' : 'text-gray-500 hover:text-[#1B4F72]'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        {active ? 'В сравнении' : isFull ? 'Макс. 4 товара' : 'Сравнить'}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={!active && isFull}
      className={`p-2 rounded-lg transition-all ${
        active
          ? 'bg-[#1B4F72] text-white'
          : isFull
            ? 'bg-white/90 text-gray-300 cursor-not-allowed shadow-sm'
            : 'bg-white/90 text-gray-600 hover:bg-[#1B4F72] hover:text-white shadow-sm'
      }`}
      title={active ? 'Убрать из сравнения' : isFull ? 'Максимум 4 товара' : 'Сравнить'}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    </button>
  )
}
