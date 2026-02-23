import { ProductCard } from '@/components/catalog/ProductCard'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { searchProducts, type SearchResult } from '@/lib/qdrant'
import { getCurrencySettings } from '@/lib/price'
import type { Metadata } from 'next'

type Props = {
  searchParams: Promise<{ q?: string; page?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `Поиск: ${q}` : 'Поиск',
    robots: { index: false },
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = '' } = await searchParams
  const { exchangeRate, displayCurrency } = await getCurrencySettings()

  let result: SearchResult | null = null

  if (q.length >= 2) {
    result = await searchProducts(q, 24)
  }

  const products = result?.products ?? []
  const isRAG = result?.source === 'rag'
  const chunksFound = result?.chunksFound ?? 0
  const retrievalTimeMs = result?.retrievalTimeMs ?? 0

  // Extract text context from RAG sources when no Payload products found
  const ragContext =
    isRAG && products.length === 0 && result?.ragSources?.length
      ? result.ragSources.slice(0, 5)
      : null

  return (
    <div className="container mx-auto px-4 py-6">
      <Breadcrumbs items={[{ label: `Поиск: ${q}` }]} />

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {q ? `Результаты поиска: «${q}»` : 'Поиск'}
      </h1>

      {q && (
        <div className="flex items-center gap-3 mb-6">
          <p className="text-gray-500">
            {products.length > 0
              ? `Найдено ${products.length} товаров`
              : ragContext
                ? `Найдена информация в базе знаний (${chunksFound} источников)`
                : 'Ничего не найдено. Попробуйте изменить запрос.'}
          </p>

          {result && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isRAG
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {isRAG ? 'Семантический поиск' : 'Текстовый поиск'}
            </span>
          )}

          {isRAG && retrievalTimeMs > 0 && (
            <span className="text-xs text-gray-400">
              {retrievalTimeMs} мс
            </span>
          )}
        </div>
      )}

      {/* Search form */}
      <form action="/search" method="get" className="mb-8">
        <div className="flex gap-2 max-w-xl">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Введите модель или название..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B4F72]"
          />
          <button
            type="submit"
            className="bg-[#1B4F72] text-white px-6 py-2 rounded-lg hover:bg-[#163d5a] transition font-medium"
          >
            Найти
          </button>
        </div>
      </form>

      {/* Product cards grid */}
      {products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} exchangeRate={exchangeRate} displayCurrency={displayCurrency} />
          ))}
        </div>
      )}

      {/* RAG context fallback (info found but no matching products in Payload) */}
      {ragContext && (
        <div className="space-y-4 max-w-3xl">
          <p className="text-sm text-gray-500 mb-2">
            Товары не найдены в каталоге, но найдена релевантная информация:
          </p>
          {ragContext.map((source, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex items-center gap-2 mb-1">
                {source.model && (
                  <span className="font-semibold text-[#1B4F72]">
                    {source.model}
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {source.section}
                </span>
                <span className="text-xs text-gray-300">
                  {Math.round(source.score * 100)}%
                </span>
              </div>
              <p className="text-sm text-gray-700">{source.text_preview}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
