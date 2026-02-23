'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { registerCustomer, loginCustomer } from '@/lib/auth'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', password2: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.password2) {
      setError('Пароли не совпадают')
      return
    }

    if (form.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }

    setLoading(true)

    try {
      await registerCustomer({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
      })
      // Auto-login after registration
      await loginCustomer(form.email, form.password)
      router.push('/profile')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={[{ label: 'Регистрация' }]} />

      <div className="max-w-md mx-auto mt-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Регистрация</h1>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
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
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
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
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Телефон
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30 focus:border-[#1B4F72]"
              placeholder="+7 (___) ___-__-__"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Пароль *
            </label>
            <input
              id="password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30 focus:border-[#1B4F72]"
              placeholder="Минимум 6 символов"
            />
          </div>

          <div>
            <label htmlFor="password2" className="block text-sm font-medium text-gray-700 mb-1">
              Подтверждение пароля *
            </label>
            <input
              id="password2"
              type="password"
              required
              value={form.password2}
              onChange={(e) => setForm((f) => ({ ...f, password2: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30 focus:border-[#1B4F72]"
              placeholder="Повторите пароль"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1B4F72] hover:bg-[#163d5a] text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-60"
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>

          <p className="text-sm text-gray-500 text-center">
            Уже есть аккаунт?{' '}
            <Link href="/auth/login" className="text-[#1B4F72] hover:underline font-medium">
              Войти
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
