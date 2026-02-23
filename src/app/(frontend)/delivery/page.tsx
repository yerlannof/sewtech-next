import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Доставка и оплата',
  description: 'Доставка промышленных швейных машин по Казахстану. Самовывоз из Алматы. Условия оплаты.',
}

export default function DeliveryPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <Breadcrumbs items={[{ label: 'Доставка и оплата' }]} />
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Доставка и оплата</h1>

      <div className="prose prose-lg max-w-3xl">
        <h2>Доставка</h2>
        <ul>
          <li><strong>Самовывоз</strong> — бесплатно, из нашего офиса в Алматы</li>
          <li><strong>По Алматы</strong> — доставка курьером</li>
          <li><strong>По Казахстану</strong> — транспортными компаниями (Pony Express, СДЭК и др.)</li>
        </ul>

        <h2>Оплата</h2>
        <ul>
          <li>Наличный расчёт</li>
          <li>Безналичный расчёт (для юридических лиц)</li>
          <li>Перевод на карту</li>
        </ul>

        <h2>Гарантия</h2>
        <p>
          На всё оборудование JUKI действует официальная гарантия производителя.
          Гарантийное обслуживание осуществляется в нашем сервисном центре в Алматы.
        </p>

        <p>
          По вопросам доставки и оплаты обращайтесь по телефону{' '}
          <a href="tel:+77071234567">+7 (707) 123-45-67</a> или в{' '}
          <a href="https://wa.me/77071234567" target="_blank" rel="noopener noreferrer">WhatsApp</a>.
        </p>
      </div>
    </div>
  )
}
