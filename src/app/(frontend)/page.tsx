import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { ProductCard } from '@/components/catalog/ProductCard'
import { CONTACTS } from '@/lib/contacts'
import { getCurrencySettings } from '@/lib/price'

export default async function HomePage() {
  const payload = await getPayload({ config })
  const { exchangeRate, displayCurrency } = await getCurrencySettings()

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
    where: { parent: { exists: false }, showInMegaMenu: { equals: true } },
    sort: 'sortOrder',
    limit: 20,
  })

  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#1B4F72] via-[#1a5a80] to-[#2E86C1] text-white py-20 md:py-28 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full bg-white/5" />
        <div className="absolute bottom-[-120px] left-[-60px] w-[400px] h-[400px] rounded-full bg-white/5" />

        <div className="container mx-auto px-4 text-center relative z-10">
          <span className="inline-block bg-white/15 backdrop-blur-sm text-sm font-medium px-4 py-1.5 rounded-full mb-6 tracking-wide">
            Официальный дилер JUKI в Казахстане
          </span>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 tracking-tight">SEWTECH</h1>
          <p className="text-xl md:text-2xl text-blue-100 font-light mb-6">
            Промышленные швейные машины в Алматы
          </p>
          <p className="text-blue-200/80 mb-10 max-w-2xl mx-auto leading-relaxed">
            Более 500 моделей промышленного швейного оборудования. Продажа, сервис, запчасти.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/catalog"
              className="bg-white text-[#1B4F72] font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 hover:shadow-lg transition-all duration-200"
            >
              Перейти в каталог
            </Link>
            <a
              href={`https://wa.me/${CONTACTS.whatsapp}?text=Здравствуйте! Хочу проконсультироваться по швейному оборудованию.`}
              className="border-2 border-white/80 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 hover:border-white transition-all duration-200"
              target="_blank"
              rel="noopener"
            >
              Консультация в WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Каталог оборудования</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {categories.docs.map((cat) => (
              <Link
                key={cat.id}
                href={`/catalog/${cat.slug}`}
                className="group bg-white p-6 rounded-xl border border-gray-200 hover:border-[#1B4F72] hover:shadow-lg transition-all duration-200 text-center"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-[#1B4F72] transition-colors duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1B4F72] group-hover:text-white transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-800 group-hover:text-[#1B4F72] transition-colors">{cat.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured products */}
      {featured.docs.length > 0 && (
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">В наличии в Алматы</h2>
              <Link href="/catalog" className="text-[#1B4F72] hover:text-[#163d5a] text-sm font-medium transition-colors">
                Все товары <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {featured.docs.map((product) => (
                <ProductCard key={product.id} product={product as any} exchangeRate={exchangeRate} displayCurrency={displayCurrency} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Advantages */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">Почему SEWTECH?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Официальный дилер JUKI',
                desc: 'Прямые поставки от производителя. Гарантия качества и подлинности оборудования.',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
              {
                title: 'Более 24 лет опыта',
                desc: 'Работаем с 2000 года. Знаем особенности каждой модели и поможем выбрать оптимальное решение.',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                title: 'Сервис и запчасти',
                desc: 'Собственный сервисный центр в Алматы. Оригинальные запчасти в наличии и под заказ.',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.title} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#1B4F72] mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
