'use client'

import Link from 'next/link'
import { useCart } from '@/lib/store/cart-context'

export function CartIcon() {
  const { count, isHydrated } = useCart()

  return (
    <Link
      href="/cart"
      className="relative p-2 text-gray-600 hover:text-[#1B4F72] transition-colors"
      aria-label={`Корзина${count > 0 ? ` (${count})` : ''}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
      {isHydrated && count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-[#1B4F72] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
