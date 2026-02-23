'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useFavorites } from '@/lib/store/favorites-context'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

export default function FavoritesPage() {
  const { items, remove, count } = useFavorites()

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={[{ label: 'Избранное' }]} />

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Избранное {count > 0 && `(${count})`}
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <p className="text-gray-500 text-lg mb-4">Список избранного пуст</p>
          <Link
            href="/catalog"
            className="inline-block bg-[#1B4F72] hover:bg-[#163d5a] text-white font-medium py-3 px-8 rounded-xl transition-colors"
          >
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item) => (
            <div
              key={item.productId}
              className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 relative"
            >
              {/* Remove button */}
              <button
                onClick={() => remove(item.productId)}
                className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 rounded-lg text-gray-400 hover:text-red-500 shadow-sm transition-colors"
                title="Убрать из избранного"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <Link href={`/product/${item.slug}`}>
                <div className="aspect-square bg-gray-50 relative overflow-hidden">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-contain p-3 group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-800 text-sm line-clamp-2 group-hover:text-[#1B4F72] transition-colors min-h-[2.5rem]">
                    {item.name}
                  </h3>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {item.price && item.price > 0 ? (
                      <p className="text-lg font-bold text-[#1B4F72]">
                        {new Intl.NumberFormat('ru-RU').format(item.price)}{' '}
                        <span className="text-sm font-normal text-gray-500">&#8376;</span>
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">Цена по запросу</p>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
