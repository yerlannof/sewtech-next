import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Контакты',
  description: 'Контакты SEWTECH в Алматы. Адрес, телефон, WhatsApp. Официальный дилер JUKI в Казахстане.',
}

export default function ContactsPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <Breadcrumbs items={[{ label: 'Контакты' }]} />
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Контакты</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Адрес</h2>
              <p className="text-gray-600">г. Алматы, Казахстан</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Телефон</h2>
              <a href="tel:+77071234567" className="text-[#1B4F72] hover:underline text-lg font-medium">
                +7 (707) 123-45-67
              </a>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp</h2>
              <a
                href="https://wa.me/77071234567"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition font-medium"
              >
                Написать в WhatsApp
              </a>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Режим работы</h2>
              <p className="text-gray-600">Пн-Пт: 09:00 — 18:00</p>
              <p className="text-gray-600">Сб: 10:00 — 15:00</p>
              <p className="text-gray-600">Вс: выходной</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Email</h2>
              <a href="mailto:info@sewtech.kz" className="text-[#1B4F72] hover:underline">info@sewtech.kz</a>
            </div>
          </div>
        </div>

        <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center min-h-[300px]">
          <p className="text-gray-500 text-center">Карта будет добавлена позже</p>
        </div>
      </div>
    </div>
  )
}
