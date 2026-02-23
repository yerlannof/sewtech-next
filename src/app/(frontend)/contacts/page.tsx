import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { CONTACTS } from '@/lib/contacts'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Контакты',
  description: 'Контакты SEWTECH в Алматы. Адрес, телефон, WhatsApp. Официальный дилер JUKI в Казахстане.',
}

export default function ContactsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={[{ label: 'Контакты' }]} />
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Контакты</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Адрес</h2>
              <p className="text-gray-600">{CONTACTS.addressFull}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Телефон</h2>
              <a href={`tel:${CONTACTS.phoneRaw}`} className="text-[#1B4F72] hover:underline text-lg font-medium">
                {CONTACTS.phone}
              </a>
              <p className="text-gray-500 text-sm mt-1">Факс: {CONTACTS.fax}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp</h2>
              <a
                href={`https://wa.me/${CONTACTS.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl transition-colors font-medium"
              >
                Написать в WhatsApp
              </a>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Режим работы</h2>
              <p className="text-gray-600">Пн-Пт: {CONTACTS.hours.weekdays}</p>
              <p className="text-gray-600">Сб: {CONTACTS.hours.saturday}</p>
              <p className="text-gray-600">Вс: {CONTACTS.hours.sunday}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Email</h2>
              <a href={`mailto:${CONTACTS.email}`} className="text-[#1B4F72] hover:underline">{CONTACTS.email}</a>
            </div>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden min-h-[400px]">
          <iframe
            src={`https://yandex.ru/map-widget/v1/?ll=${CONTACTS.coordinates.lng},${CONTACTS.coordinates.lat}&z=16&pt=${CONTACTS.coordinates.lng},${CONTACTS.coordinates.lat},pm2rdm`}
            width="100%"
            height="400"
            style={{ border: 0, borderRadius: '12px' }}
            allowFullScreen
            title="SEWTECH на карте"
          />
        </div>
      </div>
    </div>
  )
}
