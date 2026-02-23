import Link from 'next/link'
import { MobileMenu } from './MobileMenu'

const NAV_ITEMS = [
  { label: 'Каталог', href: '/catalog' },
  { label: 'Прямострочные', href: '/catalog/dlya-poshiva-odezhdy/odnoigolnaya-pryamostrochnaya' },
  { label: 'Оверлоки', href: '/catalog/dlya-poshiva-odezhdy/overlok-kraeobmyotochnaya' },
  { label: 'Автоматы', href: '/catalog/dlya-poshiva-odezhdy/avtomaticheskaya-shvejnaya-mashina' },
  { label: 'Закрепочные', href: '/catalog/dlya-poshiva-odezhdy/zakrepochnaya-mashina' },
  { label: 'О компании', href: '/about' },
  { label: 'Контакты', href: '/contacts' },
]

export async function Header() {
  // TODO: fetch from Payload global later
  return (
    <header>
      {/* Top bar */}
      <div className="bg-[#1B4F72] text-white text-sm">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <a href="tel:+77071234567" className="hover:text-blue-200 transition">
            +7 (707) 123-45-67
          </a>
          <span className="hidden sm:inline text-blue-200">
            Официальный дилер JUKI в Казахстане
          </span>
          <a
            href="https://wa.me/77071234567"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-xs font-medium transition"
          >
            WhatsApp
          </a>
        </div>
      </div>

      {/* Main bar */}
      <div className="bg-white border-b shadow-sm relative">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="text-2xl font-bold text-[#1B4F72] shrink-0">
            SEWTECH
          </Link>

          {/* Desktop search */}
          <div className="flex-1 max-w-xl mx-auto hidden md:block">
            <form action="/search" method="get">
              <div className="relative">
                <input
                  type="search"
                  name="q"
                  placeholder="Поиск по каталогу..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1B4F72] transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </div>

          {/* Desktop phone */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <a
              href="tel:+77071234567"
              className="text-sm font-medium text-gray-700 hover:text-[#1B4F72] transition"
            >
              +7 (707) 123-45-67
            </a>
          </div>

          {/* Mobile: search icon + hamburger */}
          <div className="flex items-center gap-1 md:hidden ml-auto">
            <Link href="/search" className="p-2 text-gray-600 hover:text-[#1B4F72] transition">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </Link>
            <MobileMenu />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-gray-50 border-b hidden md:block">
        <div className="container mx-auto px-4">
          <ul className="flex gap-6 py-2 text-sm">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-gray-600 hover:text-[#1B4F72] font-medium transition"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  )
}
