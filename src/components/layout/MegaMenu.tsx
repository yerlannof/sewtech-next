'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

export interface NavCategory {
  name: string
  slug: string
  icon?: string
  children: { name: string; slug: string }[]
}

interface MegaMenuProps {
  categories: NavCategory[]
}

export function MegaMenu({ categories }: MegaMenuProps) {
  const [open, setOpen] = useState(false)
  const [activeRoot, setActiveRoot] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(true)
  }

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200)
  }

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Reset active root when menu opens
  useEffect(() => {
    if (open) setActiveRoot(0)
  }, [open])

  const activeCat = categories[activeRoot]

  return (
    <div ref={menuRef} className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Link
        href="/catalog"
        className="inline-flex items-center gap-1 px-4 py-2.5 text-gray-600 hover:text-[#1B4F72] hover:bg-blue-50/50 font-medium transition-colors rounded-lg text-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Каталог
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Link>

      {open && (
        <div className="absolute top-full left-0 mt-0 bg-white border border-gray-200 rounded-xl shadow-xl ring-1 ring-black/5 z-50 flex max-h-[420px] min-w-[580px]">
          {/* Left panel — root categories */}
          <div className="w-56 border-r border-gray-100 py-2 shrink-0 flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {categories.map((cat, i) => (
                <Link
                  key={cat.slug}
                  href={`/catalog/${cat.slug}`}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                    i === activeRoot
                      ? 'bg-blue-50 text-[#1B4F72] font-semibold border-l-2 border-[#1B4F72]'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-[#1B4F72]'
                  }`}
                  onMouseEnter={() => setActiveRoot(i)}
                  onClick={() => setOpen(false)}
                >
                  {cat.icon && <span className="text-base shrink-0">{cat.icon}</span>}
                  <span className="truncate">{cat.name}</span>
                  {cat.children.length > 0 && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-auto shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </Link>
              ))}
            </div>

            {/* Bottom link */}
            <div className="border-t border-gray-100 pt-2 px-4 pb-2">
              <Link
                href="/catalog"
                className="text-sm text-[#1B4F72] hover:underline font-medium"
                onClick={() => setOpen(false)}
              >
                Весь каталог →
              </Link>
            </div>
          </div>

          {/* Right panel — subcategories of active root */}
          <div className="flex-1 p-5 overflow-y-auto">
            {activeCat && (
              <>
                <Link
                  href={`/catalog/${activeCat.slug}`}
                  className="text-sm font-bold text-[#1B4F72] hover:underline block mb-3"
                  onClick={() => setOpen(false)}
                >
                  {activeCat.name}
                </Link>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {activeCat.children.map((child) => (
                    <Link
                      key={child.slug}
                      href={`/catalog/${activeCat.slug}/${child.slug}`}
                      className="text-sm text-gray-600 hover:text-[#1B4F72] hover:bg-gray-50 rounded-md px-2 -mx-2 transition-colors py-1.5 block"
                      onClick={() => setOpen(false)}
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
