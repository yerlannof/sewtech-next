import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ProductCard } from '@/components/catalog/ProductCard'
import type { Metadata } from 'next'
import type { Category } from '@/payload-types'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ category: string; subcategory: string }>
  searchParams: Promise<{ page?: string; sort?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subcategory } = await params
  const payload = await getPayload({ config })

  const subCat = await payload.find({
    collection: 'categories',
    where: { slug: { equals: subcategory } },
    limit: 1,
  })

  const name = subCat.docs[0]?.name || subcategory
  return {
    title: `${name} — купить в Алматы | SEWTECH`,
    description: `${name} JUKI. Цены, характеристики, наличие. Доставка по Казахстану.`,
  }
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const { category, subcategory } = await params
  const { page = '1', sort = 'name' } = await searchParams
  const currentPage = parseInt(page)
  const perPage = 24

  const payload = await getPayload({ config })

  // Find the subcategory
  const subCatResult = await payload.find({
    collection: 'categories',
    where: { slug: { equals: subcategory } },
    limit: 1,
  })
  if (!subCatResult.docs.length) notFound()
  const subCat = subCatResult.docs[0]

  // Find parent category for breadcrumbs
  const parentCatResult = await payload.find({
    collection: 'categories',
    where: { slug: { equals: category } },
    limit: 1,
  })
  const parentCat = parentCatResult.docs[0]

  // Fetch products in this subcategory
  const products = await payload.find({
    collection: 'products',
    where: { subcategory: { equals: subCat.id } },
    sort,
    page: currentPage,
    limit: perPage,
    depth: 1, // Populate brand, images, category relations
  })

  return (
    <div className="container mx-auto px-4 py-6">
      <Breadcrumbs
        items={[
          { label: 'Каталог', href: '/catalog' },
          ...(parentCat
            ? [{ label: parentCat.name, href: `/catalog/${parentCat.slug}` }]
            : []),
          { label: subCat.name },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{subCat.name}</h1>
          <p className="text-gray-500 mt-1">
            {products.totalDocs}{' '}
            {pluralize(products.totalDocs, 'товар', 'товара', 'товаров')}
          </p>
        </div>

        <SortSelect currentSort={sort} category={category} subcategory={subcategory} />
      </div>

      {products.docs.length === 0 ? (
        <p className="text-gray-500 py-10 text-center">
          Товары в этой категории скоро появятся
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.docs.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {products.totalPages > 1 && (
            <nav aria-label="Pagination" className="flex justify-center gap-2 mt-8">
              {currentPage > 1 && (
                <Link
                  href={`/catalog/${category}/${subcategory}?page=${currentPage - 1}&sort=${sort}`}
                  className="px-3 py-2 rounded text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  &larr;
                </Link>
              )}
              {Array.from({ length: products.totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/catalog/${category}/${subcategory}?page=${p}&sort=${sort}`}
                  className={`px-3 py-2 rounded text-sm ${
                    p === currentPage
                      ? 'bg-[#1B4F72] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </Link>
              ))}
              {currentPage < products.totalPages && (
                <Link
                  href={`/catalog/${category}/${subcategory}?page=${currentPage + 1}&sort=${sort}`}
                  className="px-3 py-2 rounded text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  &rarr;
                </Link>
              )}
            </nav>
          )}
        </>
      )}

      {/* SEO: subcategory description at bottom */}
      {subCat.description && (
        <div className="mt-12 pt-8 border-t text-sm text-gray-600 max-w-3xl">
          <p>{subCat.description}</p>
        </div>
      )}
    </div>
  )
}

/** Russian pluralization (1 товар, 2 товара, 5 товаров) */
function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

/** Sort dropdown — a simple form-based approach for Server Components */
function SortSelect({
  currentSort,
  category,
  subcategory,
}: {
  currentSort: string
  category: string
  subcategory: string
}) {
  const options = [
    { value: 'name', label: 'По названию' },
    { value: 'price', label: 'Сначала дешевые' },
    { value: '-price', label: 'Сначала дорогие' },
    { value: '-createdAt', label: 'Новинки' },
  ]

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-select" className="text-sm text-gray-500 whitespace-nowrap">
        Сортировка:
      </label>
      <div className="relative">
        {options.map((opt) => (
          <Link
            key={opt.value}
            href={`/catalog/${category}/${subcategory}?sort=${opt.value}`}
            className={`inline-block px-2 py-1 text-xs rounded mr-1 ${
              currentSort === opt.value
                ? 'bg-[#1B4F72] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
