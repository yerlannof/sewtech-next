'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/lib/store/cart-context'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

export default function CartPage() {
  const { items, remove, updateQty, clear, count, total } = useCart()
  const [form, setForm] = useState({ name: '', phone: '', email: '', comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Заполните имя и телефон')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.name,
          customerPhone: form.phone,
          customerEmail: form.email || undefined,
          comment: form.comment || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            productName: i.name,
            quantity: i.quantity,
            price: i.price,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Ошибка при отправке')
      }

      setSubmitted(true)
      clear()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при отправке')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-lg mx-auto text-center py-20">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Заявка отправлена!</h1>
          <p className="text-gray-600 mb-6">
            Наш менеджер свяжется с вами в ближайшее время для подтверждения заказа.
          </p>
          <Link
            href="/catalog"
            className="inline-block bg-[#1B4F72] hover:bg-[#163d5a] text-white font-medium py-3 px-8 rounded-xl transition-colors"
          >
            Вернуться в каталог
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={[{ label: 'Корзина' }]} />

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Корзина {count > 0 && `(${count})`}
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          <p className="text-gray-500 text-lg mb-4">Корзина пуста</p>
          <Link
            href="/catalog"
            className="inline-block bg-[#1B4F72] hover:bg-[#163d5a] text-white font-medium py-3 px-8 rounded-xl transition-colors"
          >
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-4 bg-white border border-gray-200 rounded-xl p-4">
                <Link href={`/product/${item.slug}`} className="w-20 h-20 bg-gray-50 rounded-lg relative overflow-hidden shrink-0">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} fill className="object-contain p-1" sizes="80px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${item.slug}`} className="font-medium text-gray-800 hover:text-[#1B4F72] line-clamp-2 text-sm">
                    {item.name}
                  </Link>
                  {item.price ? (
                    <p className="text-sm font-bold text-[#1B4F72] mt-1">
                      {new Intl.NumberFormat('ru-RU').format(item.price)} &#8376;
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Цена по запросу</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.productId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30"
                      >
                        -
                      </button>
                      <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.productId, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => remove(item.productId)}
                      className="ml-auto text-sm text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order form */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Оформить заявку</h2>

              {total > 0 && (
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                  <span className="text-gray-600">Итого:</span>
                  <span className="text-xl font-bold text-[#1B4F72]">
                    {new Intl.NumberFormat('ru-RU').format(total)} &#8376;
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Имя *
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30 focus:border-[#1B4F72]"
                    placeholder="Ваше имя"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Телефон *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30 focus:border-[#1B4F72]"
                    placeholder="+7 (___) ___-__-__"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30 focus:border-[#1B4F72]"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                    Комментарий
                  </label>
                  <textarea
                    id="comment"
                    rows={3}
                    value={form.comment}
                    onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30 focus:border-[#1B4F72] resize-none"
                    placeholder="Любые пожелания к заказу"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#1B4F72] hover:bg-[#163d5a] text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Отправка...' : 'Отправить заявку'}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Менеджер свяжется с вами для подтверждения
                </p>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
