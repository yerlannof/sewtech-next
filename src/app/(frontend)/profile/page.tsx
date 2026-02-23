'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentCustomer, logoutCustomer } from '@/lib/auth'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { Customer } from '@/payload-types'

interface Order {
  id: number
  orderNumber: string
  status: string
  totalAmount?: number
  createdAt: string
  items?: Array<{ productName: string; quantity: number; price?: number }>
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'Новый', color: 'bg-blue-100 text-blue-700' },
  processing: { label: 'В обработке', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Завершен', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Отменен', color: 'bg-red-100 text-red-700' },
}

export default function ProfilePage() {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentCustomer().then((user) => {
      if (!user) {
        router.push('/auth/login')
        return
      }
      setCustomer(user)

      // Fetch customer orders
      fetch(`/api/orders?where[customer][equals]=${user.id}&sort=-createdAt&limit=20`, {
        credentials: 'include',
      })
        .then((r) => r.json())
        .then((data) => setOrders(data.docs || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    })
  }, [router])

  const handleLogout = async () => {
    await logoutCustomer()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-20 text-gray-400">Загрузка...</div>
      </div>
    )
  }

  if (!customer) return null

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={[{ label: 'Личный кабинет' }]} />

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Личный кабинет</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-500 transition-colors"
        >
          Выйти
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Customer info */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Данные профиля</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Имя</dt>
                <dd className="text-sm font-medium text-gray-900">{customer.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-sm font-medium text-gray-900">{customer.email}</dd>
              </div>
              {customer.phone && (
                <div>
                  <dt className="text-sm text-gray-500">Телефон</dt>
                  <dd className="text-sm font-medium text-gray-900">{customer.phone}</dd>
                </div>
              )}
              {customer.city && (
                <div>
                  <dt className="text-sm text-gray-500">Город</dt>
                  <dd className="text-sm font-medium text-gray-900">{customer.city}</dd>
                </div>
              )}
              {customer.company && (
                <div>
                  <dt className="text-sm text-gray-500">Компания</dt>
                  <dd className="text-sm font-medium text-gray-900">{customer.company}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Orders */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-4">История заказов</h2>

          {orders.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
              <p className="mb-4">У вас пока нет заказов</p>
              <Link
                href="/catalog"
                className="inline-block bg-[#1B4F72] hover:bg-[#163d5a] text-white font-medium py-2.5 px-6 rounded-xl transition-colors text-sm"
              >
                Перейти в каталог
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const status = STATUS_LABELS[order.status] || STATUS_LABELS.new
                return (
                  <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-medium text-gray-900">{order.orderNumber}</span>
                        <span className="text-sm text-gray-400 ml-3">
                          {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    {order.items && order.items.length > 0 && (
                      <ul className="text-sm text-gray-600 space-y-1">
                        {order.items.map((item, i) => (
                          <li key={i}>
                            {item.productName} x {item.quantity}
                            {item.price ? ` — ${new Intl.NumberFormat('ru-RU').format(item.price * item.quantity)} \u20B8` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                    {order.totalAmount && order.totalAmount > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 text-right">
                        <span className="font-bold text-[#1B4F72]">
                          {new Intl.NumberFormat('ru-RU').format(order.totalAmount)} &#8376;
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
