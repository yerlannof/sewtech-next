import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { Category } from '@/payload-types'

export const metadata = {
  title: 'Каталог промышленных швейных машин | SEWTECH Алматы',
  description:
    'Промышленные швейные машины JUKI: прямострочные, оверлоки, закрепочные, петельные, автоматы. Купить в Алматы.',
}

export default async function CatalogPage() {
  const payload = await getPayload({ config })

  // Get parent categories (those without a parent)
  const parentCats = await payload.find({
    collection: 'categories',
    where: { parent: { exists: false } },
    sort: 'sortOrder',
    limit: 100,
  })

  const categoriesWithChildren = await Promise.all(
    parentCats.docs.map(async (parent) => {
      const children = await payload.find({
        collection: 'categories',
        where: { parent: { equals: parent.id } },
        sort: 'sortOrder',
        limit: 100,
      })
      return { parent, children: children.docs }
    }),
  )

  return (
    <div className="container mx-auto px-4 py-6">
      <Breadcrumbs items={[{ label: 'Каталог' }]} />
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Каталог оборудования</h1>

      <div className="space-y-10">
        {categoriesWithChildren.map(({ parent, children }) => (
          <section key={parent.id}>
            <h2 className="text-xl font-semibold text-[#1B4F72] mb-4 border-b pb-2">
              {parent.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {children.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/catalog/${(parent as Category).slug}/${cat.slug}`}
                  className="block p-4 border rounded-lg hover:border-[#1B4F72] hover:shadow-md transition bg-white"
                >
                  <h3 className="font-medium text-gray-800">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{cat.description}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
