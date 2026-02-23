import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { ProductCard } from '@/components/catalog/ProductCard'

export default async function HomePage() {
  const payload = await getPayload({ config })

  // Featured / in-stock products
  const featured = await payload.find({
    collection: 'products',
    where: { inStock: { equals: true } },
    limit: 8,
    sort: 'name',
    depth: 1,
  })

  // Parent categories
  const categories = await payload.find({
    collection: 'categories',
    where: { parent: { exists: false } },
    sort: 'sortOrder',
    limit: 10,
  })

  return (
    <>
      {/* Hero */}
      <section className="bg-[#1B4F72] text-white py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">SEWTECH</h1>
          <p className="text-xl md:text-2xl text-blue-200 mb-6">
            Промышленные швейные машины в Алматы
          </p>
          <p className="text-blue-300 mb-8 max-w-2xl mx-auto">
            Официальный дилер JUKI в Казахстане. Более 500 моделей промышленного швейного оборудования. Продажа, сервис, запчасти.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/catalog"
              className="bg-white text-[#1B4F72] font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition"
            >
              Перейти в каталог
            </Link>
            <a
              href="https://wa.me/77071234567?text=Здравствуйте! Хочу проконсультироваться по швейному оборудованию."
              className="border-2 border-white text-white font-semibold px-8 py-3 rounded-lg hover:bg-white/10 transition"
              target="_blank"
              rel="noopener"
            >
              Консультация в WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Каталог оборудования</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.docs.map((cat) => (
              <Link
                key={cat.id}
                href={`/catalog/${cat.slug}`}
                className="bg-white p-6 rounded-lg border hover:border-[#1B4F72] hover:shadow-md transition text-center"
              >
                <h3 className="font-medium text-gray-800">{cat.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured products */}
      {featured.docs.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">В наличии в Алматы</h2>
              <Link href="/catalog" className="text-[#1B4F72] hover:underline text-sm font-medium">
                Все товары →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.docs.map((product) => (
                <ProductCard key={product.id} product={product as any} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Advantages */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Почему SEWTECH?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Официальный дилер JUKI', desc: 'Прямые поставки от производителя. Гарантия качества и подлинности оборудования.' },
              { title: 'Более 24 лет опыта', desc: 'Работаем с 2000 года. Знаем особенности каждой модели и поможем выбрать оптимальное решение.' },
              { title: 'Сервис и запчасти', desc: 'Собственный сервисный центр в Алматы. Оригинальные запчасти в наличии и под заказ.' },
            ].map((item) => (
              <div key={item.title} className="bg-white p-6 rounded-lg border">
                <h3 className="font-semibold text-lg text-[#1B4F72] mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
