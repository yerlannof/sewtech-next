'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useComparison } from '@/lib/store/comparison-context'

export function ComparisonBar() {
  const { items, remove, count, clear, isHydrated } = useComparison()

  if (!isHydrated || count === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {items.map((item) => (
            <div key={item.productId} className="relative shrink-0">
              <div className="w-14 h-14 bg-gray-50 rounded-lg border border-gray-200 relative overflow-hidden">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.name} fill className="object-contain p-1" sizes="56px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                    N/A
                  </div>
                )}
              </div>
              <button
                onClick={() => remove(item.productId)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors"
              >
                &times;
              </button>
            </div>
          ))}
          {Array.from({ length: 4 - count }).map((_, i) => (
            <div key={`empty-${i}`} className="w-14 h-14 border-2 border-dashed border-gray-200 rounded-lg shrink-0" />
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={clear}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Очистить
          </button>
          <Link
            href="/compare"
            className="bg-[#1B4F72] hover:bg-[#163d5a] text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            Сравнить ({count})
          </Link>
        </div>
      </div>
    </div>
  )
}
