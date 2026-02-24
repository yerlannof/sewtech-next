import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ category: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const payload = await getPayload({ config })
  const cat = await payload.find({
    collection: 'categories',
    where: { slug: { equals: category } },
    limit: 1,
  })
  const name = cat.docs[0]?.name || category
  return {
    title: `${name} | SEWTECH Алматы`,
    description: `${name} — промышленные швейные машины JUKI. Купить в Алматы с доставкой по Казахстану.`,
    alternates: {
      canonical: `/catalog/${category}`,
    },
    openGraph: {
      title: `${name} | SEWTECH Алматы`,
      description: `${name} — промышленные швейные машины JUKI. Купить в Алматы с доставкой по Казахстану.`,
    },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params
  const payload = await getPayload({ config })

  const catResult = await payload.find({
    collection: 'categories',
    where: { slug: { equals: category } },
    limit: 1,
  })
  if (!catResult.docs.length) notFound()
  const cat = catResult.docs[0]

  const children = await payload.find({
    collection: 'categories',
    where: { parent: { equals: cat.id } },
    sort: 'sortOrder',
    limit: 100,
  })

  // Count products per subcategory
  const childrenWithCounts = await Promise.all(
    children.docs.map(async (child) => {
      const count = await payload.count({
        collection: 'products',
        where: { subcategory: { equals: child.id } },
      })
      return { ...child, productCount: count.totalDocs }
    }),
  )

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs
        items={[{ label: 'Каталог', href: '/catalog' }, { label: cat.name }]}
      />

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{cat.name}</h1>
      {cat.description && (
        <div className="text-gray-600 mb-6" dangerouslySetInnerHTML={{ __html: cat.description }} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {childrenWithCounts
          .filter((child) => child.productCount > 0)
          .map((child) => (
            <Link
              key={child.id}
              href={`/catalog/${category}/${child.slug}`}
              className="group flex items-center justify-between p-5 bg-white border border-gray-200 rounded-xl hover:border-[#1B4F72] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <span className="font-medium text-gray-800 group-hover:text-[#1B4F72] transition-colors">{child.name}</span>
              <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full group-hover:bg-[#1B4F72]/90 group-hover:text-white transition-all duration-200">
                {child.productCount}
              </span>
            </Link>
          ))}
      </div>

      {childrenWithCounts.filter((c) => c.productCount > 0).length === 0 && (
        <p className="text-gray-400 py-16 text-center">
          Подкатегории скоро появятся
        </p>
      )}
    </div>
  )
}
