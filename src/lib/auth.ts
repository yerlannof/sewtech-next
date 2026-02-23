import type { Customer } from '@/payload-types'

const API_BASE = '/api/customers'

export async function loginCustomer(email: string, password: string): Promise<{ token: string; user: Customer }> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.errors?.[0]?.message || 'Неверный email или пароль')
  }

  return res.json()
}

export async function registerCustomer(data: {
  name: string
  email: string
  password: string
  phone?: string
}): Promise<{ doc: Customer }> {
  const res = await fetch(`${API_BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.errors?.[0]?.message || 'Ошибка регистрации')
  }

  return res.json()
}

export async function getCurrentCustomer(): Promise<Customer | null> {
  try {
    const res = await fetch(`${API_BASE}/me`, {
      credentials: 'include',
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.user || null
  } catch {
    return null
  }
}

export async function logoutCustomer(): Promise<void> {
  await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}
