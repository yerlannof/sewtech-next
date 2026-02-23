import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ProductCard } from '@/components/catalog/ProductCard'
import { ProductActions } from './ProductActions'
import type { Metadata } from 'next'
import type { Product, Brand, Category, Media } from '@/payload-types'
import { sanitizeDescriptionHtml } from '@/lib/sanitize-html'
import { CONTACTS } from '@/lib/contacts'
import { getCurrencySettings, formatPrice, convertToKZT } from '@/lib/price'

type Props = { params: Promise<{ slug: string }> }

async function getProduct(slug: string): Promise<Product | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
    depth: 2,
    limit: 1,
  })
  return result.docs[0] || null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return {}

  const brand = typeof product.brand === 'object' ? (product.brand as Brand) : null
  const brandName = brand?.name || 'JUKI'
  const specs = (product.specifications || []) as Array<{ name: string; value: string }>
  const specsPreview = specs.slice(0, 3).map((s) => `${s.name}: ${s.value}`).join('. ')
  const metaTitle = product.meta?.title || `${product.name} — купить в Алматы`
  const metaDesc =
    product.meta?.description ||
    `${product.name}. ${specsPreview ? specsPreview + '. ' : ''}Цена, характеристики, наличие. Официальный дилер ${brandName} в Казахстане.`

  const images = product.images as Media[] | null | undefined
  const ogImage = images?.[0]?.sizes?.card?.url || images?.[0]?.url

  return {
    title: metaTitle,
    description: metaDesc,
    alternates: {
      canonical: `/product/${slug}`,
    },
    openGraph: {
      title: metaTitle,
      description: metaDesc,
      type: 'website',
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const [product, currencySettings] = await Promise.all([getProduct(slug), getCurrencySettings()])
  if (!product) notFound()

  const { exchangeRate, displayCurrency } = currencySettings

  // Resolve populated relations with type safety
  const brand: Brand | null =
    typeof product.brand === 'object' && product.brand !== null
      ? (product.brand as Brand)
      : null

  const category: Category | null =
    typeof product.category === 'object' && product.category !== null
      ? (product.category as Category)
      : null

  const subcategory: Category | null =
    typeof product.subcategory === 'object' && product.subcategory !== null
      ? (product.subcategory as Category)
      : null

  const images = (product.images || []).filter(
    (img): img is Media => typeof img === 'object' && img !== null,
  )

  const specs = product.specifications || []
  const faqs = product.faq || []
  const errorCodes = product.errorCodes || []

  const relatedProducts = (product.relatedProducts || []).filter(
    (rp): rp is Product => typeof rp === 'object' && rp !== null,
  )

  const mainImage = images[0]
  const mainImageUrl = mainImage?.sizes?.card?.url || mainImage?.url

  const hasPrice = typeof product.price === 'number' && product.price > 0
  const showErrorCodes = errorCodes.length > 0

  // --- Schema.org: Product ---
  const brandName = brand?.name || 'JUKI'

  const productSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    ...(product.sku && { sku: product.sku }),
    brand: { '@type': 'Brand', name: brandName },
    ...(product.shortDescription && { description: product.shortDescription }),
    ...(mainImageUrl && { image: mainImageUrl }),
    ...(hasPrice && {
      offers: {
        '@type': 'Offer',
        price: convertToKZT(product.price!, exchangeRate),
        priceCurrency: 'KZT',
        availability: product.inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/PreOrder',
        seller: {
          '@type': 'Organization',
          name: 'SEWTECH',
        },
      },
    }),
  }

  // --- Schema.org: FAQPage ---
  const faqSchema =
    faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
          })),
        }
      : null

  // --- Schema.org: BreadcrumbList ---
  const breadcrumbItems: { label: string; href?: string }[] = [
    { label: 'Каталог', href: '/catalog' },
    ...(category
      ? [{ label: category.name, href: `/catalog/${category.slug}` }]
      : []),
    ...(subcategory && category
      ? [
          {
            label: subcategory.name,
            href: `/catalog/${category.slug}/${subcategory.slug}`,
          },
        ]
      : []),
    { label: product.name },
  ]

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://sewtech.kz/' },
      ...breadcrumbItems.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: item.label,
        ...(item.href && { item: `https://sewtech.kz${item.href}` }),
      })),
    ],
  }

  const hasDescription = !!(product.fullDescription || product.descriptionHtml)

  // Determine which tabs have content
  const tabs = [
    ...(hasDescription ? [{ id: 'description', label: 'Описание' }] : []),
    ...(specs.length > 0 ? [{ id: 'specs', label: 'Характеристики' }] : []),
    ...(faqs.length > 0 ? [{ id: 'faq', label: 'Вопросы и ответы' }] : []),
    ...(showErrorCodes ? [{ id: 'error-codes', label: 'Коды ошибок' }] : []),
  ]

  return (
    <>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* ========== TOP SECTION: Image + Info ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-4 mb-12">
          {/* Left: Image gallery */}
          <div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="aspect-square relative">
                {mainImageUrl ? (
                  <Image
                    src={mainImageUrl}
                    alt={mainImage?.alt || product.name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-24 w-24"
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
              </div>

              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
                  {images.map((img, i) => {
                    const thumbUrl = img.sizes?.thumbnail?.url || img.url
                    if (!thumbUrl) return null
                    return (
                      <div
                        key={img.id ?? i}
                        className="w-16 h-16 flex-shrink-0 border border-gray-200 rounded-lg relative hover:border-[#1B4F72] transition-colors cursor-pointer"
                      >
                        <Image
                          src={thumbUrl}
                          alt={img.alt || ''}
                          fill
                          className="object-contain p-1"
                          sizes="64px"
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Product info */}
          <div>
            {/* Brand badge */}
            {brand && (
              <span className="inline-block bg-blue-50 text-[#1B4F72] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide mb-3">
                {brand.name}
              </span>
            )}

            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>

            {product.sku && (
              <p className="text-sm text-gray-400 mb-4">
                Артикул: {product.sku}
              </p>
            )}

            {/* Price */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              {hasPrice ? (
                <p className="text-3xl font-bold text-[#1B4F72]">
                  {formatPrice(product.price!, exchangeRate, displayCurrency)}
                </p>
              ) : (
                <p className="text-lg text-gray-500 italic">Цена по запросу</p>
              )}
            </div>

            {/* Stock status */}
            <div className="mb-6">
              {product.inStock ? (
                <span className="inline-flex items-center gap-1.5 text-green-600 font-medium">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                  В наличии в Алматы
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
                  <span className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
                  Под заказ
                </span>
              )}
            </div>

            {/* Short description */}
            {product.shortDescription && (
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                {product.shortDescription}
              </p>
            )}

            {/* Key specs preview (first 5) */}
            {specs.length > 0 && (
              <div className="border border-gray-200 rounded-xl p-5 mb-6 bg-white shadow-sm">
                <h3 className="font-medium text-sm text-gray-500 uppercase tracking-wide mb-3">
                  Основные характеристики
                </h3>
                <dl className="space-y-2.5">
                  {specs.slice(0, 5).map((spec, i) => (
                    <div key={spec.id ?? spec.name} className={`flex justify-between text-sm gap-4 ${i < Math.min(specs.length, 5) - 1 ? 'pb-2.5 border-b border-gray-100' : ''}`}>
                      <dt className="text-gray-600 shrink-0">{spec.name}</dt>
                      <dd className="text-gray-900 font-medium text-right">
                        {spec.value}
                        {spec.unit ? ` ${spec.unit}` : ''}
                      </dd>
                    </div>
                  ))}
                </dl>
                {specs.length > 5 && (
                  <a
                    href="#specs"
                    className="block mt-3 text-xs text-[#1B4F72] hover:underline"
                  >
                    Все характеристики ({specs.length})
                  </a>
                )}
              </div>
            )}

            {/* Cart + Favorite + Compare */}
            <ProductActions
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug || '',
                price: hasPrice ? product.price! : null,
                imageUrl: mainImageUrl || null,
              }}
            />

            {/* CTA buttons */}
            <div className="space-y-3 mt-4">
              <a
                href={`https://wa.me/${CONTACTS.whatsapp}?text=${encodeURIComponent(`Здравствуйте! Интересует ${product.name}${product.sku ? ` (арт. ${product.sku})` : ''}. Подскажите по наличию и цене.`)}`}
                className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Написать в WhatsApp
              </a>

              <a
                href={`tel:${CONTACTS.phoneRaw}`}
                className="flex items-center justify-center gap-2 w-full border-2 border-[#1B4F72] text-[#1B4F72] hover:bg-[#1B4F72] hover:text-white font-medium py-3 px-6 rounded-xl transition-all duration-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                Позвонить
              </a>
            </div>
          </div>
        </div>

        {/* ========== TAB NAVIGATION (anchor links) ========== */}
        {tabs.length > 0 && (
          <nav className="border-b mb-8 overflow-x-auto">
            <ul className="flex gap-0 min-w-max">
              {tabs.map((tab) => (
                <li key={tab.id}>
                  <a
                    href={`#${tab.id}`}
                    className="inline-block px-6 py-3.5 text-sm font-semibold text-gray-600 hover:text-[#1B4F72] border-b-2 border-transparent hover:border-[#1B4F72] transition-colors"
                  >
                    {tab.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* ========== DESCRIPTION ========== */}
        {hasDescription && (
          <section className="mb-12" id="description">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Описание</h2>
            {product.descriptionHtml ? (
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeDescriptionHtml(product.descriptionHtml) }}
              />
            ) : product.fullDescription ? (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                {product.shortDescription && <p>{product.shortDescription}</p>}
              </div>
            ) : null}
          </section>
        )}

        {/* ========== SPECIFICATIONS TABLE ========== */}
        {specs.length > 0 && (
          <section className="mb-12" id="specs">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Характеристики</h2>
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full">
                <tbody>
                  {specs.map((spec, i) => (
                    <tr
                      key={spec.id ?? i}
                      className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                    >
                      <td className="px-5 py-3.5 text-sm text-gray-600 w-1/2 border-r border-gray-200">
                        {spec.name}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-900 font-medium">
                        {spec.value}
                        {spec.unit ? ` ${spec.unit}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========== FAQ ACCORDION ========== */}
        {faqs.length > 0 && (
          <section className="mb-12" id="faq">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Вопросы и ответы
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <details key={faq.id ?? i} className="group border border-gray-200 rounded-xl">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium text-gray-800 hover:text-[#1B4F72] hover:bg-gray-50 transition-colors rounded-xl">
                    <span>{faq.question}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform shrink-0 ml-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3 leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* ========== ERROR CODES TABLE ========== */}
        {showErrorCodes && (
          <section className="mb-12" id="error-codes">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Коды ошибок
            </h2>
            <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-gray-600 font-semibold w-24">
                      Код
                    </th>
                    <th className="px-5 py-3.5 text-left text-gray-600 font-semibold">
                      Описание
                    </th>
                    <th className="px-5 py-3.5 text-left text-gray-600 font-semibold">
                      Решение
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {errorCodes.map((ec, i) => (
                    <tr
                      key={ec.id ?? i}
                      className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-5 py-3 font-mono font-medium text-[#1B4F72]">
                        {ec.code}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {ec.description}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {ec.solution || '\u2014'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========== RELATED PRODUCTS ========== */}
        {relatedProducts.length > 0 && (
          <section className="border-t pt-10 mt-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Похожие товары
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
              {relatedProducts.slice(0, 6).map((rp) => (
                <ProductCard key={rp.id} product={rp} exchangeRate={exchangeRate} displayCurrency={displayCurrency} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
