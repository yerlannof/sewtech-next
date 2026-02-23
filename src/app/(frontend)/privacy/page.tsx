import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — SEWTECH',
  description: 'Политика конфиденциальности интернет-магазина SEWTECH. Обработка и защита персональных данных.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <Breadcrumbs items={[{ label: 'Политика конфиденциальности' }]} />

      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-8">
        Политика конфиденциальности
      </h1>

      <div className="max-w-3xl prose prose-sm text-gray-700 leading-relaxed space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-gray-900">1. Общие положения</h2>
          <p>
            Настоящая Политика конфиденциальности определяет порядок обработки и защиты
            персональных данных пользователей интернет-магазина sewtech.kz (далее — Сайт),
            принадлежащего компании SEWTECH (далее — Оператор).
          </p>
          <p>
            Использование Сайта означает согласие пользователя с настоящей Политикой
            конфиденциальности и условиями обработки персональных данных.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">2. Собираемые данные</h2>
          <p>Оператор может собирать следующие персональные данные:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Имя и фамилия</li>
            <li>Номер телефона</li>
            <li>Адрес электронной почты</li>
            <li>Адрес доставки</li>
            <li>Данные о заказах</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">3. Цели обработки данных</h2>
          <p>Персональные данные обрабатываются в следующих целях:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Обработка и выполнение заказов</li>
            <li>Связь с клиентом по вопросам заказа</li>
            <li>Предоставление консультаций по оборудованию</li>
            <li>Улучшение качества обслуживания</li>
            <li>Исполнение обязательств по гарантии</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">4. Защита данных</h2>
          <p>
            Оператор принимает необходимые организационные и технические меры для защиты
            персональных данных от неправомерного доступа, уничтожения, изменения,
            блокирования, копирования и распространения.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">5. Передача данных третьим лицам</h2>
          <p>
            Оператор не передает персональные данные третьим лицам, за исключением случаев,
            предусмотренных законодательством Республики Казахстан, а также случаев, когда
            передача необходима для выполнения заказа (службы доставки).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">6. Файлы cookie</h2>
          <p>
            Сайт использует файлы cookie для обеспечения корректной работы, анализа
            трафика и персонализации контента. Пользователь может отключить cookie
            в настройках браузера.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">7. Контакты</h2>
          <p>
            По вопросам, связанным с обработкой персональных данных, обращайтесь
            по электронной почте: <a href="mailto:info@sewtech.kz" className="text-[#1B4F72] hover:underline">info@sewtech.kz</a>
          </p>
        </section>

        <p className="text-sm text-gray-400 mt-8">
          Дата последнего обновления: 24 февраля 2026 года
        </p>
      </div>
    </div>
  )
}
