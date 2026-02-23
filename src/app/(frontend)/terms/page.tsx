import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

export const metadata: Metadata = {
  title: 'Условия использования — SEWTECH',
  description: 'Условия использования интернет-магазина SEWTECH. Публичная оферта, порядок оформления заказов.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <Breadcrumbs items={[{ label: 'Условия использования' }]} />

      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-8">
        Условия использования
      </h1>

      <div className="max-w-3xl prose prose-sm text-gray-700 leading-relaxed space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-gray-900">1. Общие положения</h2>
          <p>
            Настоящие условия регулируют использование интернет-магазина sewtech.kz
            (далее — Сайт) и являются публичной офертой в соответствии с
            законодательством Республики Казахстан.
          </p>
          <p>
            Оформление заказа на Сайте является акцептом настоящей оферты.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">2. Оформление заказа</h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Заказ можно оформить через Сайт, по телефону или через WhatsApp.</li>
            <li>После оформления заказа менеджер свяжется с вами для подтверждения.</li>
            <li>Цены на Сайте указаны в тенге (KZT) и могут быть изменены без предварительного уведомления.</li>
            <li>Товар резервируется после подтверждения заказа менеджером.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">3. Оплата</h2>
          <p>Принимаемые способы оплаты:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Наличными при получении</li>
            <li>Банковский перевод</li>
            <li>Безналичный расчет (для юридических лиц)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">4. Доставка</h2>
          <p>
            Доставка осуществляется по Алматы и всему Казахстану. Подробные условия
            доставки указаны на{' '}
            <a href="/delivery" className="text-[#1B4F72] hover:underline">
              странице доставки
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">5. Гарантия и возврат</h2>
          <p>
            Условия гарантии и возврата товара описаны на{' '}
            <a href="/warranty" className="text-[#1B4F72] hover:underline">
              странице гарантии
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">6. Ответственность</h2>
          <p>
            Продавец не несет ответственности за ущерб, возникший вследствие нарушения
            покупателем правил эксплуатации оборудования, указанных в инструкции производителя.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">7. Разрешение споров</h2>
          <p>
            Все споры разрешаются путем переговоров. В случае невозможности урегулирования
            спора в досудебном порядке, спор передается на рассмотрение в суд по месту
            нахождения продавца в соответствии с законодательством Республики Казахстан.
          </p>
        </section>

        <p className="text-sm text-gray-400 mt-8">
          Дата последнего обновления: 24 февраля 2026 года
        </p>
      </div>
    </div>
  )
}
