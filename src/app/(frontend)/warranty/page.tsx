import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { CONTACTS } from '@/lib/contacts'

export const metadata: Metadata = {
  title: 'Гарантия и сервис — SEWTECH',
  description:
    'Гарантия на промышленные швейные машины JUKI 12 месяцев. Сервисный центр в Алматы. Условия гарантии, обмена и возврата.',
  alternates: { canonical: '/warranty' },
}

export default function WarrantyPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <Breadcrumbs items={[{ label: 'Гарантия и сервис' }]} />

      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-8">
        Гарантия и сервис
      </h1>

      <div className="max-w-3xl space-y-10">
        {/* Warranty terms */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Гарантийные условия
          </h2>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-4">
            <p className="text-lg font-medium text-[#1B4F72]">
              Гарантия на промышленные швейные машины JUKI — 12 месяцев
            </p>
          </div>
          <ul className="space-y-3 text-gray-700 leading-relaxed">
            <li className="flex gap-3">
              <span className="text-[#1B4F72] font-bold shrink-0">1.</span>
              Гарантия действует с момента продажи при наличии документа о покупке.
            </li>
            <li className="flex gap-3">
              <span className="text-[#1B4F72] font-bold shrink-0">2.</span>
              Гарантия распространяется на заводские дефекты оборудования.
            </li>
            <li className="flex gap-3">
              <span className="text-[#1B4F72] font-bold shrink-0">3.</span>
              Гарантийный ремонт выполняется в сервисном центре SEWTECH в Алматы.
            </li>
            <li className="flex gap-3">
              <span className="text-[#1B4F72] font-bold shrink-0">4.</span>
              На расходные материалы (иглы, шпульки, ножи, ремни) гарантия не распространяется.
            </li>
            <li className="flex gap-3">
              <span className="text-[#1B4F72] font-bold shrink-0">5.</span>
              Гарантия аннулируется при нарушении правил эксплуатации, самостоятельном ремонте или механических повреждениях.
            </li>
          </ul>
        </section>

        {/* Service center */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Сервисный центр
          </h2>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-3 text-gray-700">
            <p>
              <span className="font-medium text-gray-900">Адрес:</span>{' '}
              {CONTACTS.address}
            </p>
            <p>
              <span className="font-medium text-gray-900">Телефон:</span>{' '}
              <a href={`tel:${CONTACTS.phoneRaw}`} className="text-[#1B4F72] hover:underline">
                {CONTACTS.phone}
              </a>
            </p>
            <p>
              <span className="font-medium text-gray-900">Режим работы:</span>{' '}
              Пн-Пт: {CONTACTS.hours.weekdays}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Запишитесь на сервис по телефону или через WhatsApp.
            </p>
          </div>
        </section>

        {/* Returns */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Обмен и возврат
          </h2>
          <div className="space-y-3 text-gray-700 leading-relaxed">
            <p>
              Обмен и возврат товара осуществляется в соответствии с Законом Республики
              Казахстан «О защите прав потребителей».
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Возврат товара надлежащего качества — в течение 14 дней с момента покупки.</li>
              <li>Товар должен сохранить товарный вид, упаковку и комплектацию.</li>
              <li>Возврат товара ненадлежащего качества — в течение гарантийного срока.</li>
              <li>Для возврата необходимо предоставить документ о покупке.</li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#1B4F72] to-[#2E86C1] text-white rounded-xl p-6 text-center">
          <p className="text-lg font-medium mb-4">
            Есть вопросы по гарантии или сервису?
          </p>
          <a
            href={`https://wa.me/${CONTACTS.whatsapp}?text=${encodeURIComponent('Здравствуйте! У меня вопрос по гарантии/сервису.')}`}
            className="inline-block bg-white text-[#1B4F72] font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Написать в WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
