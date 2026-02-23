import { getPayload } from 'payload'
import config from '@payload-config'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Бренды',
  description: 'Бренды промышленных швейных машин: JUKI, Brother, Durkopp Adler, Aurora, Pegasus, Golden Wheel, MAQI.',
}

export default async function BrandsPage() {
  const payload = await getPayload({ config })
  const brands = await payload.find({ collection: 'brands', sort: 'name', limit: 100 })

  return (
    <div className="container mx-auto px-4 py-6">
      <Breadcrumbs items={[{ label: 'Бренды' }]} />
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Бренды</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {brands.docs.map((brand) => (
          <div key={brand.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition">
            <h2 className="text-xl font-bold text-[#1B4F72] mb-2">{brand.name}</h2>
            {brand.country && <p className="text-sm text-gray-500 mb-2">{brand.country}</p>}
            {brand.description && <p className="text-gray-600 text-sm mb-3">{brand.description}</p>}
            {brand.isOfficialDistributor && (
              <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                Официальный дилер
              </span>
            )}
          </div>
        ))}
      </div>

      {brands.docs.length === 0 && (
        <p className="text-gray-500 text-center py-10">Бренды будут добавлены в ближайшее время</p>
      )}
    </div>
  )
}
