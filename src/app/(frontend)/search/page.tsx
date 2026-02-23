import { getPayload } from 'payload'
import config from '@payload-config'
import { ProductCard } from '@/components/catalog/ProductCard'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
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
  const { q = '', page = '1' } = await searchParams
  const currentPage = parseInt(page)

  const payload = await getPayload({ config })

  let results = { docs: [] as any[], totalDocs: 0, totalPages: 0 }

  if (q.length >= 2) {
    results = await payload.find({
      collection: 'products',
      where: {
        or: [
          { name: { like: q } },
          { sku: { like: q } },
        ],
      },
      limit: 24,
      page: currentPage,
      sort: 'name',
      depth: 1,
    })
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Breadcrumbs items={[{ label: `Поиск: ${q}` }]} />

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {q ? `Результаты поиска: «${q}»` : 'Поиск'}
      </h1>

      {q && (
        <p className="text-gray-500 mb-6">
          {results.totalDocs > 0
            ? `Найдено ${results.totalDocs} товаров`
            : 'Ничего не найдено. Попробуйте изменить запрос.'}
        </p>
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

      {results.docs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.docs.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
