'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { NavCategory } from './MegaMenu'
import { CONTACTS } from '@/lib/contacts'

interface MobileMenuProps {
  categories: NavCategory[]
}

export function MobileMenu({ categories }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  const close = () => {
    setOpen(false)
    setExpandedCat(null)
  }

  const toggleCat = (slug: string) => {
    setExpandedCat((prev) => (prev === slug ? null : slug))
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-600 hover:text-[#1B4F72] transition-colors"
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
        <div className="absolute top-full left-0 right-0 bg-white border-b shadow-xl z-50 md:hidden max-h-[80vh] overflow-y-auto">
          {/* Mobile search */}
          <div className="px-4 pt-3 pb-2">
            <form action="/search" method="get">
              <input
                type="search"
                name="q"
                placeholder="Поиск по каталогу..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30"
              />
            </form>
          </div>

          {/* Category accordion */}
          <nav className="px-4 pb-2">
            <Link
              href="/catalog"
              onClick={close}
              className="block py-2.5 px-3 text-gray-700 hover:text-[#1B4F72] hover:bg-blue-50 rounded-xl font-medium transition-colors"
            >
              Весь каталог
            </Link>

            {categories.map((cat) => (
              <div key={cat.slug}>
                <div className="flex items-center">
                  <Link
                    href={`/catalog/${cat.slug}`}
                    onClick={close}
                    className="flex-1 py-2.5 px-3 text-gray-700 hover:text-[#1B4F72] font-medium transition-colors"
                  >
                    {cat.name}
                  </Link>
                  {cat.children.length > 0 && (
                    <button
                      onClick={() => toggleCat(cat.slug)}
                      className="p-2 text-gray-400 hover:text-[#1B4F72]"
                      aria-label="Показать подкатегории"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 transition-transform ${expandedCat === cat.slug ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>
                {expandedCat === cat.slug && cat.children.length > 0 && (
                  <ul className="pl-6 pb-2">
                    {cat.children.map((child) => (
                      <li key={child.slug}>
                        <Link
                          href={`/catalog/${cat.slug}/${child.slug}`}
                          onClick={close}
                          className="block py-1.5 px-3 text-sm text-gray-600 hover:text-[#1B4F72] transition-colors"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </nav>

          {/* Static links */}
          <div className="border-t px-4 py-2">
            <Link href="/about" onClick={close} className="block py-2.5 px-3 text-gray-700 hover:text-[#1B4F72] font-medium transition-colors">
              О компании
            </Link>
            <Link href="/contacts" onClick={close} className="block py-2.5 px-3 text-gray-700 hover:text-[#1B4F72] font-medium transition-colors">
              Контакты
            </Link>
          </div>

          {/* Phone + WhatsApp */}
          <div className="border-t px-4 py-3 flex items-center justify-between">
            <a href={`tel:${CONTACTS.phoneRaw}`} className="text-sm font-medium text-gray-700">
              {CONTACTS.phone}
            </a>
            <a
              href={`https://wa.me/${CONTACTS.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  )
}
