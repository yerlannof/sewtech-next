import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'О компании',
  description: 'SEWTECH — официальный дилер JUKI в Казахстане. Более 24 лет опыта. Продажа и обслуживание промышленных швейных машин в Алматы.',
}

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <Breadcrumbs items={[{ label: 'О компании' }]} />
      <h1 className="text-3xl font-bold text-gray-900 mb-6">О компании SEWTECH</h1>

      <div className="prose prose-lg max-w-3xl">
        <p>
          <strong>SEWTECH</strong> — ведущий поставщик промышленного швейного оборудования в Казахстане.
          С 2000 года мы являемся официальным дилером японской компании <strong>JUKI Corporation</strong> —
          мирового лидера в производстве промышленных швейных машин.
        </p>

        <h2>Наши преимущества</h2>
        <ul>
          <li><strong>Официальный дилер JUKI</strong> — прямые поставки от производителя, гарантия подлинности</li>
          <li><strong>Более 500 моделей</strong> промышленного оборудования в каталоге</li>
          <li><strong>Собственный сервисный центр</strong> в Алматы с квалифицированными инженерами</li>
          <li><strong>Оригинальные запчасти</strong> в наличии и под заказ</li>
          <li><strong>Доставка по всему Казахстану</strong></li>
          <li><strong>Консультация и подбор</strong> оборудования под задачи вашего производства</li>
        </ul>

        <h2>Наш опыт</h2>
        <p>
          За более чем 24 года работы мы оснастили сотни швейных производств по всему Казахстану.
          Наши клиенты — фабрики по пошиву одежды, мастерские по ремонту обуви, производители
          мебели, автомобильных чехлов и многие другие предприятия.
        </p>

        <h2>Бренды</h2>
        <p>
          Помимо JUKI, мы предлагаем оборудование других ведущих мировых производителей:
          Brother, Durkopp Adler, Aurora, Pegasus, Golden Wheel и MAQI.
        </p>
      </div>
    </div>
  )
}
