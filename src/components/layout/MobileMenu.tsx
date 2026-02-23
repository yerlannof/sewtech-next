'use client'

import { useState } from 'react'
import Link from 'next/link'

const NAV_ITEMS = [
  { label: 'Каталог', href: '/catalog' },
  { label: 'Прямострочные', href: '/catalog/dlya-poshiva-odezhdy/odnoigolnaya-pryamostrochnaya' },
  { label: 'Оверлоки', href: '/catalog/dlya-poshiva-odezhdy/overlok-kraeobmyotochnaya' },
  { label: 'Автоматы', href: '/catalog/dlya-poshiva-odezhdy/avtomaticheskaya-shvejnaya-mashina' },
  { label: 'Закрепочные', href: '/catalog/dlya-poshiva-odezhdy/zakrepochnaya-mashina' },
  { label: 'О компании', href: '/about' },
  { label: 'Контакты', href: '/contacts' },
]

export function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-600 hover:text-[#1B4F72] transition"
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border-b shadow-lg z-50 md:hidden">
          {/* Mobile search */}
          <div className="px-4 pt-3 pb-2">
            <form action="/search" method="get">
              <input
                type="search"
                name="q"
                placeholder="Поиск по каталогу..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]"
              />
            </form>
          </div>

          {/* Navigation links */}
          <nav className="px-4 pb-4">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block py-2.5 px-3 text-gray-700 hover:text-[#1B4F72] hover:bg-gray-50 rounded-lg font-medium transition"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Phone + WhatsApp */}
          <div className="border-t px-4 py-3 flex items-center justify-between">
            <a href="tel:+77071234567" className="text-sm font-medium text-gray-700">
              +7 (707) 123-45-67
            </a>
            <a
              href="https://wa.me/77071234567"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  )
}
