import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { MobileMenu } from './MobileMenu'
import { MegaMenu, type NavCategory } from './MegaMenu'
import { CartIcon } from '../cart/CartIcon'
import { FavoritesIcon } from '../favorites/FavoritesIcon'
import { UserIcon } from './UserIcon'
import type { Category } from '@/payload-types'
import { CONTACTS } from '@/lib/contacts'

const STATIC_NAV = [
  { label: 'О компании', href: '/about' },
  { label: 'Контакты', href: '/contacts' },
]

async function getNavCategories(): Promise<NavCategory[]> {
  const payload = await getPayload({ config })

  // Fetch top-level categories visible in mega menu
  const parents = await payload.find({
    collection: 'categories',
    where: {
      and: [
        { parent: { exists: false } },
        { showInMegaMenu: { equals: true } },
      ],
    },
    sort: 'sortOrder',
    limit: 20,
  })

  // Fetch all child categories
  const parentIds = parents.docs.map((p) => p.id)
  const children = parentIds.length
    ? await payload.find({
        collection: 'categories',
        where: {
          and: [
            { parent: { in: parentIds } },
            { showInMegaMenu: { not_equals: false } },
          ],
        },
        sort: 'sortOrder',
        limit: 200,
      })
    : { docs: [] }

  return parents.docs.map((parent) => ({
    name: parent.name,
    slug: parent.slug || '',
    icon: (parent as unknown as Record<string, unknown>).icon as string | undefined,
    children: children.docs
      .filter((c) => {
        const pid = typeof c.parent === 'object' ? (c.parent as Category).id : c.parent
        return pid === parent.id
      })
      .map((c) => ({ name: c.name, slug: c.slug || '' })),
  }))
}

export async function Header() {
  const categories = await getNavCategories()

  return (
    <header>
      {/* Top bar */}
      <div className="bg-gradient-to-r from-[#1B4F72] to-[#1a5a80] text-white text-sm">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <a href={`tel:${CONTACTS.phoneRaw}`} className="hover:text-blue-200 transition-colors">
            {CONTACTS.phone}
          </a>
          <span className="hidden sm:inline text-blue-200">
            Официальный дилер JUKI в Казахстане
          </span>
          <a
            href={`https://wa.me/${CONTACTS.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded-full text-xs font-medium transition-colors"
          >
            WhatsApp
          </a>
        </div>
      </div>

      {/* Main bar */}
      <div className="bg-white border-b shadow-sm relative">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="shrink-0 flex items-center gap-2">
            <span className="text-2xl font-extrabold text-[#1B4F72] tracking-tight">SEWTECH</span>
            <span className="hidden lg:inline text-xs text-gray-400 border-l border-gray-200 pl-2">Швейное оборудование</span>
          </Link>

          {/* Desktop search */}
          <div className="flex-1 max-w-xl mx-auto hidden md:block">
            <form action="/search" method="get">
              <div className="relative">
                <input
                  type="search"
                  name="q"
                  placeholder="Поиск по каталогу..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30 focus:border-[#1B4F72] transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1B4F72] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>

          {/* Desktop: phone + icons */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <a
              href={`tel:${CONTACTS.phoneRaw}`}
              className="text-sm font-medium text-gray-700 hover:text-[#1B4F72] transition-colors"
            >
              {CONTACTS.phone}
            </a>
            <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
              <UserIcon />
              <FavoritesIcon />
              <CartIcon />
            </div>
          </div>

          {/* Mobile: icons + hamburger */}
          <div className="flex items-center gap-1 md:hidden ml-auto">
            <UserIcon />
            <FavoritesIcon />
            <CartIcon />
            <Link href="/search" className="p-2 text-gray-600 hover:text-[#1B4F72] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>
            <MobileMenu categories={categories} />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-white border-b hidden md:block">
        <div className="container mx-auto px-4">
          <ul className="flex gap-0 py-0 text-sm items-center">
            <li>
              <MegaMenu categories={categories} />
            </li>
            {STATIC_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-block px-4 py-2.5 text-gray-600 hover:text-[#1B4F72] hover:bg-blue-50/50 font-medium transition-colors rounded-lg"
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
