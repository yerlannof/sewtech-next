'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useComparison } from '@/lib/store/comparison-context'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { Product, Media, Brand } from '@/payload-types'

export default function ComparePage() {
  const { items, remove } = useComparison()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (items.length === 0) {
      setProducts([])
      setLoading(false)
      return
    }

    const ids = items.map((i) => i.productId).join(',')
    fetch(`/api/products?ids=${ids}`)
      .then((r) => r.json())
      .then((data) => {
        // Maintain order from items
        const ordered = items
          .map((item) => data.docs?.find((p: Product) => p.id === item.productId))
          .filter(Boolean) as Product[]
        setProducts(ordered)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [items])

  // Collect all unique spec names across products
  const allSpecNames = Array.from(
    new Set(products.flatMap((p) => (p.specifications || []).map((s) => s.name))),
  )

  const getSpec = (product: Product, specName: string) => {
    const spec = product.specifications?.find((s) => s.name === specName)
    return spec ? `${spec.value}${spec.unit ? ` ${spec.unit}` : ''}` : '\u2014'
  }

  const getImage = (product: Product): string | null => {
    const first = product.images?.[0]
    if (typeof first === 'object' && first !== null) {
      const media = first as Media
      return media.sizes?.thumbnail?.url || media.url || null
    }
    return null
  }

  const getBrand = (product: Product): string => {
    if (typeof product.brand === 'object' && product.brand !== null) {
      return (product.brand as Brand).name
    }
    return ''
  }

  const valuesAllSame = (specName: string) => {
    const values = products.map((p) => getSpec(p, specName))
    return values.every((v) => v === values[0])
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-20 text-gray-400">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={[{ label: 'Сравнение товаров' }]} />

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Сравнение товаров</h1>

      {products.length === 0 ? (
        <div className="text-center py-20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500 text-lg mb-4">Нет товаров для сравнения</p>
          <Link
            href="/catalog"
            className="inline-block bg-[#1B4F72] hover:bg-[#163d5a] text-white font-medium py-3 px-8 rounded-xl transition-colors"
          >
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            {/* Product headers (sticky) */}
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left p-3 w-48 text-sm text-gray-500 font-normal align-top">
                  Товар
                </th>
                {products.map((product) => (
                  <th key={product.id} className="p-3 text-left align-top min-w-[200px]">
                    <div className="relative">
                      <button
                        onClick={() => remove(product.id)}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded-full flex items-center justify-center text-xs transition-colors"
                        title="Убрать"
                      >
                        &times;
                      </button>
                      <Link href={`/product/${product.slug}`} className="block">
                        <div className="w-32 h-32 bg-gray-50 rounded-lg relative overflow-hidden mb-3 mx-auto">
                          {getImage(product) ? (
                            <Image src={getImage(product)!} alt={product.name} fill className="object-contain p-2" sizes="128px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">N/A</div>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-800 hover:text-[#1B4F72] line-clamp-2">
                          {product.name}
                        </p>
                      </Link>
                      {getBrand(product) && (
                        <p className="text-xs text-gray-400 mt-1">{getBrand(product)}</p>
                      )}
                    </div>
                  </th>
                ))}
              </tr>

              {/* Price row */}
              <tr className="border-b border-gray-200 bg-gray-50">
                <td className="p-3 text-sm text-gray-500">Цена</td>
                {products.map((product) => (
                  <td key={product.id} className="p-3">
                    {product.price && product.price > 0 && !product.priceOnRequest ? (
                      <span className="text-lg font-bold text-[#1B4F72]">
                        {new Intl.NumberFormat('ru-RU').format(product.price)} &#8376;
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">По запросу</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Stock row */}
              <tr className="border-b border-gray-200">
                <td className="p-3 text-sm text-gray-500">Наличие</td>
                {products.map((product) => (
                  <td key={product.id} className="p-3">
                    {product.inStock ? (
                      <span className="text-green-600 text-sm font-medium">В наличии</span>
                    ) : (
                      <span className="text-amber-600 text-sm font-medium">Под заказ</span>
                    )}
                  </td>
                ))}
              </tr>
            </thead>

            {/* Specs */}
            <tbody>
              {allSpecNames.map((specName, i) => {
                const same = valuesAllSame(specName)
                return (
                  <tr
                    key={specName}
                    className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="p-3 text-sm text-gray-500">{specName}</td>
                    {products.map((product) => {
                      const val = getSpec(product, specName)
                      return (
                        <td
                          key={product.id}
                          className={`p-3 text-sm ${same ? 'text-gray-700' : 'text-gray-900 font-medium bg-yellow-50/50'}`}
                        >
                          {val}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
