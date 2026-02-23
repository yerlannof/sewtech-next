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
    <div className="container mx-auto px-4 py-6">
      <Breadcrumbs
        items={[{ label: 'Каталог', href: '/catalog' }, { label: cat.name }]}
      />

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{cat.name}</h1>
      {cat.description && <p className="text-gray-600 mb-6">{cat.description}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {childrenWithCounts.map((child) => (
          <Link
            key={child.id}
            href={`/catalog/${category}/${child.slug}`}
            className="flex items-center justify-between p-4 bg-white border rounded-lg hover:border-[#1B4F72] hover:shadow-md transition"
          >
            <span className="font-medium text-gray-800">{child.name}</span>
            <span className="text-sm text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {child.productCount}
            </span>
          </Link>
        ))}
      </div>

      {childrenWithCounts.length === 0 && (
        <p className="text-gray-500 py-10 text-center">
          Подкатегории скоро появятся
        </p>
      )}
    </div>
  )
}
