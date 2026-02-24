import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ProductCard } from '@/components/catalog/ProductCard'
import { CatalogFilters } from '@/components/catalog/CatalogFilters'
import { FilterBottomSheet } from '@/components/catalog/FilterBottomSheet'
import {
  parseFilters,
  buildPayloadWhere,
  buildFilterUrl,
  MOTOR_TYPE_NORMALIZE,
  normalizeLubrication,
  normalizeThreadCount,
  SPEC_FILTER_NAMES,
} from '@/lib/catalog-filters'
import { getCurrencySettings } from '@/lib/price'
import type { Metadata } from 'next'
import type { Brand } from '@/payload-types'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ category: string; subcategory: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, subcategory } = await params
  const payload = await getPayload({ config })

  const subCat = await payload.find({
    collection: 'categories',
    where: { slug: { equals: subcategory } },
    limit: 1,
  })

  const name = subCat.docs[0]?.name || subcategory
  return {
    title: `${name} — купить в Алматы`,
    description: `${name} JUKI. Цены, характеристики, наличие. Доставка по Казахстану.`,
    alternates: {
      canonical: `/catalog/${category}/${subcategory}`,
    },
  }
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const { category, subcategory } = await params
  const sp = await searchParams
  const page = parseInt(sp.page || '1')
  const sort = sp.sort || 'name'
  const perPage = 24

  const payload = await getPayload({ config })
  const { exchangeRate, displayCurrency } = await getCurrencySettings()

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

  // Parse filters
  const filters = parseFilters(sp)
  const baseWhere = { subcategory: { equals: subCat.id } }

  // Fetch all products in this subcategory for filter options (including specs)
  // We do this BEFORE the main query so we can use spec-based post-filter IDs
  const allForFilters = await payload.find({
    collection: 'products',
    where: { subcategory: { equals: subCat.id } },
    select: {
      brand: true,
      machineType: true,
      purpose: true,
      maxSpeed: true,
      needleCount: true,
      price: true,
      specifications: true,
    },
    depth: 1,
    limit: 500,
  })

  // Collect filter option data
  const brandMap = new Map<number, { label: string; count: number }>()
  const typeMap = new Map<string, number>()
  const purposeMap = new Map<string, number>()
  const needleMap = new Map<number, number>()
  let hasSpeedData = false

  // Spec-based filter maps (value → count)
  const platformMap = new Map<string, number>()
  const stitchMap = new Map<string, number>()
  const motorMap = new Map<string, number>()
  const lubricationMap = new Map<string, number>()
  const threadMap = new Map<string, number>()

  // Price range tracking
  let priceMin = Infinity
  let priceMax = 0

  // Helper: extract normalized spec value from a product's specifications array
  type SpecItem = { name: string; value: string; unit?: string | null }

  function getSpecValue(specs: SpecItem[] | undefined | null, specName: string): string | null {
    if (!specs) return null
    const found = specs.find((s) => s.name === specName)
    return found?.value?.trim() || null
  }

  // Build per-product spec lookup for post-filtering
  type ProductSpecMap = Map<number, Record<string, string>>
  const productSpecs: ProductSpecMap = new Map()

  for (const p of allForFilters.docs) {
    if (p.brand && typeof p.brand === 'object') {
      const b = p.brand as Brand
      const existing = brandMap.get(b.id)
      brandMap.set(b.id, { label: b.name, count: (existing?.count || 0) + 1 })
    }
    if (p.machineType) {
      typeMap.set(p.machineType, (typeMap.get(p.machineType) || 0) + 1)
    }
    if (p.purpose) {
      purposeMap.set(p.purpose, (purposeMap.get(p.purpose) || 0) + 1)
    }
    if (p.maxSpeed) {
      hasSpeedData = true
    }
    if (p.needleCount) {
      needleMap.set(p.needleCount, (needleMap.get(p.needleCount) || 0) + 1)
    }

    // Price range
    if (p.price && p.price > 0) {
      if (p.price < priceMin) priceMin = p.price
      if (p.price > priceMax) priceMax = p.price
    }

    // Spec-based filters
    const specs = p.specifications as SpecItem[] | undefined
    const specRecord: Record<string, string> = {}

    const platformVal = getSpecValue(specs, SPEC_FILTER_NAMES.platform)
    if (platformVal) {
      platformMap.set(platformVal, (platformMap.get(platformVal) || 0) + 1)
      specRecord.platform = platformVal
    }

    const stitchVal = getSpecValue(specs, SPEC_FILTER_NAMES.stitch)
    if (stitchVal) {
      stitchMap.set(stitchVal, (stitchMap.get(stitchVal) || 0) + 1)
      specRecord.stitch = stitchVal
    }

    const motorRaw = getSpecValue(specs, SPEC_FILTER_NAMES.motor)
    if (motorRaw) {
      const motorVal = MOTOR_TYPE_NORMALIZE[motorRaw] || motorRaw
      motorMap.set(motorVal, (motorMap.get(motorVal) || 0) + 1)
      specRecord.motor = motorVal
    }

    const lubricationRaw = getSpecValue(specs, SPEC_FILTER_NAMES.lubrication)
    if (lubricationRaw) {
      const lubricationVal = normalizeLubrication(lubricationRaw)
      lubricationMap.set(lubricationVal, (lubricationMap.get(lubricationVal) || 0) + 1)
      specRecord.lubrication = lubricationVal
    }

    const threadRaw = getSpecValue(specs, SPEC_FILTER_NAMES.threads)
    if (threadRaw) {
      const threadVal = normalizeThreadCount(threadRaw)
      threadMap.set(threadVal, (threadMap.get(threadVal) || 0) + 1)
      specRecord.threads = threadVal
    }

    productSpecs.set(p.id, specRecord)
  }

  const brandOptions = Array.from(brandMap.entries()).map(([id, data]) => ({
    value: id,
    label: data.label,
    count: data.count,
  }))

  const typeOptions = Array.from(typeMap.entries()).map(([type, count]) => ({
    value: type,
    label: type,
    count,
  }))

  const purposeOptions = Array.from(purposeMap.entries()).map(([purpose, count]) => ({
    value: purpose,
    label: purpose,
    count,
  }))

  const needleOptions = Array.from(needleMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([count, total]) => ({
      value: count,
      label: count >= 3 ? `${count}+` : String(count),
      count: total,
    }))

  const toSortedOptions = (map: Map<string, number>) =>
    Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([value, count]) => ({ value, label: value, count }))

  const platformOptions = toSortedOptions(platformMap)
  const stitchOptions = toSortedOptions(stitchMap)
  const motorOptions = toSortedOptions(motorMap)
  const lubricationOptions = toSortedOptions(lubricationMap)
  const threadOptions = Array.from(threadMap.entries())
    .sort(([a], [b]) => {
      const na = parseInt(a), nb = parseInt(b)
      if (!isNaN(na) && !isNaN(nb)) return na - nb
      return a.localeCompare(b)
    })
    .map(([value, count]) => ({ value, label: `${value}-ниточные`, count }))

  // Price range for slider (in KZT)
  const priceRange =
    priceMax > priceMin && priceMin < Infinity
      ? { min: Math.floor(priceMin), max: Math.ceil(priceMax) }
      : undefined

  // Spec-based post-filter: collect matching product IDs
  const hasSpecFilters =
    (filters.platformType?.length || 0) > 0 ||
    (filters.stitchType?.length || 0) > 0 ||
    (filters.motorType?.length || 0) > 0 ||
    (filters.lubricationType?.length || 0) > 0 ||
    (filters.threadCount?.length || 0) > 0

  let specFilteredIds: number[] | null = null
  if (hasSpecFilters) {
    specFilteredIds = allForFilters.docs
      .filter((p) => {
        const spec = productSpecs.get(p.id)
        if (!spec) return false

        if (filters.platformType?.length && (!spec.platform || !filters.platformType.includes(spec.platform)))
          return false
        if (filters.stitchType?.length && (!spec.stitch || !filters.stitchType.includes(spec.stitch)))
          return false
        if (filters.motorType?.length && (!spec.motor || !filters.motorType.includes(spec.motor)))
          return false
        if (filters.lubricationType?.length && (!spec.lubrication || !filters.lubricationType.includes(spec.lubrication)))
          return false
        if (filters.threadCount?.length && (!spec.threads || !filters.threadCount.includes(spec.threads)))
          return false

        return true
      })
      .map((p) => p.id)
  }

  // Build the where clause, adding spec-filtered IDs constraint if needed
  let where = buildPayloadWhere(baseWhere, filters)
  if (specFilteredIds !== null) {
    if (specFilteredIds.length === 0) {
      // No products match spec filters — force empty result
      where = { and: [baseWhere, { id: { equals: -1 } }] }
    } else {
      where = buildPayloadWhere(
        { and: [baseWhere, { id: { in: specFilteredIds } }] },
        filters,
      )
    }
  }

  // Fetch products with filters
  const products = await payload.find({
    collection: 'products',
    where,
    sort,
    page,
    limit: perPage,
    depth: 1,
  })

  const activeFilterCount =
    (filters.brand?.length || 0) +
    (filters.machineType?.length || 0) +
    (filters.purpose?.length || 0) +
    (filters.needleCount?.length || 0) +
    (filters.platformType?.length || 0) +
    (filters.stitchType?.length || 0) +
    (filters.motorType?.length || 0) +
    (filters.lubricationType?.length || 0) +
    (filters.threadCount?.length || 0) +
    (filters.inStock ? 1 : 0) +
    (filters.isNew ? 1 : 0) +
    (filters.isFeatured ? 1 : 0) +
    (filters.priceMin ? 1 : 0) +
    (filters.priceMax ? 1 : 0) +
    (filters.speedMin ? 1 : 0) +
    (filters.speedMax ? 1 : 0)

  const filtersComponent = (
    <CatalogFilters
      brands={brandOptions}
      machineTypes={typeOptions}
      purposes={purposeOptions}
      needleCounts={needleOptions}
      platformTypes={platformOptions}
      stitchTypes={stitchOptions}
      motorTypes={motorOptions}
      lubricationTypes={lubricationOptions}
      threadCounts={threadOptions}
      activeBrands={filters.brand || []}
      activeTypes={filters.machineType || []}
      activePurposes={filters.purpose || []}
      activeNeedles={filters.needleCount || []}
      activePlatforms={filters.platformType || []}
      activeStitches={filters.stitchType || []}
      activeMotors={filters.motorType || []}
      activeLubrications={filters.lubricationType || []}
      activeThreads={filters.threadCount || []}
      activeInStock={filters.inStock || false}
      activeIsNew={filters.isNew || false}
      activeIsFeatured={filters.isFeatured || false}
      activePriceMin={filters.priceMin}
      activePriceMax={filters.priceMax}
      activeSpeedMin={filters.speedMin}
      activeSpeedMax={filters.speedMax}
      hasSpeedData={hasSpeedData}
      priceRange={priceRange}
    />
  )

  // Build pagination URL helper
  const basePath = `/catalog/${category}/${subcategory}`
  const paginationUrl = (p: number) => {
    const pFilters = { ...filters }
    const params = new URLSearchParams()
    if (p > 1) params.set('page', String(p))
    if (sort !== 'name') params.set('sort', sort)
    const filterUrl = buildFilterUrl(basePath, pFilters, sort)
    // Merge page param
    const url = new URL(filterUrl, 'http://localhost')
    if (p > 1) url.searchParams.set('page', String(p))
    return url.pathname + (url.search || '')
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
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

        <div className="flex items-center gap-2">
          <FilterBottomSheet activeCount={activeFilterCount}>
            {filtersComponent}
          </FilterBottomSheet>
          <SortSelect currentSort={sort} category={category} subcategory={subcategory} />
        </div>
      </div>

      <div className="flex gap-8">
        {/* Filters sidebar — desktop */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto bg-white border border-gray-100 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Фильтры</h2>
            {filtersComponent}
          </div>
        </aside>

        {/* Products grid */}
        <div className="flex-1">
          {products.docs.length === 0 ? (
            <p className="text-gray-500 py-10 text-center">
              {activeFilterCount > 0
                ? 'Нет товаров с такими фильтрами'
                : 'Товары в этой категории скоро появятся'}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.docs.map((product) => (
                  <ProductCard key={product.id} product={product} exchangeRate={exchangeRate} displayCurrency={displayCurrency} />
                ))}
              </div>

              {/* Pagination */}
              {products.totalPages > 1 && (
                <nav aria-label="Pagination" className="flex justify-center gap-2 mt-10">
                  {page > 1 && (
                    <Link
                      href={paginationUrl(page - 1)}
                      className="px-3 py-2 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-sm transition-colors min-w-[2.5rem] text-center"
                    >
                      &larr;
                    </Link>
                  )}
                  {Array.from({ length: products.totalPages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={paginationUrl(p)}
                      className={`px-3 py-2 rounded-md text-sm shadow-sm transition-colors min-w-[2.5rem] text-center ${
                        p === page
                          ? 'bg-[#1B4F72] text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {p}
                    </Link>
                  ))}
                  {page < products.totalPages && (
                    <Link
                      href={paginationUrl(page + 1)}
                      className="px-3 py-2 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-sm transition-colors min-w-[2.5rem] text-center"
                    >
                      &rarr;
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {/* SEO: subcategory description at bottom */}
      {subCat.description && (
        <div
          className="mt-12 pt-8 border-t text-sm text-gray-600 max-w-3xl"
          dangerouslySetInnerHTML={{ __html: subCat.description }}
        />
      )}
    </div>
  )
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

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
      <label className="text-sm text-gray-500 whitespace-nowrap hidden sm:inline">
        Сортировка:
      </label>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((opt) => (
          <Link
            key={opt.value}
            href={`/catalog/${category}/${subcategory}?sort=${opt.value}`}
            className={`inline-block px-3 py-1.5 text-xs rounded-full transition-colors ${
              currentSort === opt.value
                ? 'bg-[#1B4F72] text-white shadow-sm'
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
