import Link from 'next/link'
import Image from 'next/image'
import type { Product, Media } from '@/payload-types'
import { ProductCardActions } from './ProductCardActions'
import { formatPrice, type DisplayCurrency } from '@/lib/price'
import { getImageUrl } from '@/lib/media-url'

interface ProductCardProps {
  product: Product
  exchangeRate?: number
  displayCurrency?: DisplayCurrency
}

export function ProductCard({ product, exchangeRate = 470, displayCurrency = 'KZT' }: ProductCardProps) {
  // Resolve image — images can be number[] (not populated) or Media[] (populated with depth: 1)
  const firstImage = product.images?.[0]
  const media = typeof firstImage === 'object' ? (firstImage as Media) : null
  const imageUrl = getImageUrl(media)

  return (
    <div className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300">
      {/* Action buttons overlay */}
      <ProductCardActions
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug || '',
          price: product.price ?? null,
          imageUrl,
        }}
      />

      <Link href={`/product/${product.slug}`}>
        {/* Image */}
        <div className="aspect-square bg-gray-50 relative overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={media?.alt || product.name}
              fill
              className="object-contain p-3 group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.inStock && (
              <span className="bg-green-500 text-white text-[11px] px-2.5 py-0.5 rounded-full font-medium shadow-sm">
                В наличии
              </span>
            )}
            {product.isNew && (
              <span className="bg-orange-500 text-white text-[11px] px-2.5 py-0.5 rounded-full font-medium shadow-sm">
                Новинка
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-medium text-gray-800 text-sm line-clamp-2 group-hover:text-[#1B4F72] transition-colors min-h-[2.5rem]">
            {product.name}
          </h3>

          {/* Key spec preview (first 2 specs) */}
          {product.specifications && product.specifications.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {product.specifications.slice(0, 2).map((spec) => (
                <p key={spec.id || spec.name} className="text-xs text-gray-400 truncate">
                  {spec.name}: {spec.value}
                  {spec.unit ? ` ${spec.unit}` : ''}
                </p>
              ))}
            </div>
          )}

          {/* Price */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            {product.price && product.price > 0 && !product.priceOnRequest ? (
              <p className="text-lg font-bold text-[#1B4F72]">
                {formatPrice(product.price, exchangeRate, displayCurrency)}
              </p>
            ) : (
              <p className="text-sm text-gray-500">Цена по запросу</p>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}
