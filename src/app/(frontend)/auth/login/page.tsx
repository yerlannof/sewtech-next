'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loginCustomer } from '@/lib/auth'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await loginCustomer(form.email, form.password)
      router.push('/profile')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={[{ label: 'Вход' }]} />

      <div className="max-w-md mx-auto mt-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Вход в аккаунт</h1>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30 focus:border-[#1B4F72]"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30 focus:border-[#1B4F72]"
              placeholder="Ваш пароль"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1B4F72] hover:bg-[#163d5a] text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-60"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>

          <p className="text-sm text-gray-500 text-center">
            Нет аккаунта?{' '}
            <Link href="/auth/register" className="text-[#1B4F72] hover:underline font-medium">
              Зарегистрироваться
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
