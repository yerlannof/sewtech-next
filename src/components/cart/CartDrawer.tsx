'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/lib/store/cart-context'

export function CartDrawer() {
  const [open, setOpen] = useState(false)
  const { items, remove, updateQty, count, total } = useCart()

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // Lock scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 text-gray-600 hover:text-[#1B4F72] transition-colors"
        aria-label="Открыть корзину"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-[#1B4F72] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setOpen(false)} />

          {/* Drawer */}
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                Корзина {count > 0 && `(${count})`}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                  <p>Корзина пуста</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {items.map((item) => (
                    <li key={item.productId} className="flex gap-3 border-b border-gray-100 pb-4">
                      <Link
                        href={`/product/${item.slug}`}
                        onClick={() => setOpen(false)}
                        className="w-16 h-16 bg-gray-50 rounded-lg relative overflow-hidden shrink-0"
                      >
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.name} fill className="object-contain p-1" sizes="64px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/product/${item.slug}`}
                          onClick={() => setOpen(false)}
                          className="text-sm font-medium text-gray-800 hover:text-[#1B4F72] line-clamp-2"
                        >
                          {item.name}
                        </Link>
                        {item.price ? (
                          <p className="text-sm font-bold text-[#1B4F72] mt-1">
                            {new Intl.NumberFormat('ru-RU').format(item.price)} &#8376;
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1">Цена по запросу</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQty(item.productId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30"
                          >
                            -
                          </button>
                          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.productId, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:border-gray-400"
                          >
                            +
                          </button>
                          <button
                            onClick={() => remove(item.productId)}
                            className="ml-auto p-1 text-gray-400 hover:text-red-500"
                            title="Удалить"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t p-4 space-y-3">
                {total > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Итого:</span>
                    <span className="text-xl font-bold text-[#1B4F72]">
                      {new Intl.NumberFormat('ru-RU').format(total)} &#8376;
                    </span>
                  </div>
                )}
                <Link
                  href="/cart"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center bg-[#1B4F72] hover:bg-[#163d5a] text-white font-medium py-3 rounded-xl transition-colors"
                >
                  Оформить заявку
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
