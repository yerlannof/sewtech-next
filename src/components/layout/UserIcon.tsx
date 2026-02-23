'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export function UserIcon() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    // Check for payload-token cookie
    setLoggedIn(document.cookie.includes('payload-token'))
  }, [])

  return (
    <Link
      href={loggedIn ? '/profile' : '/auth/login'}
      className="p-2 text-gray-600 hover:text-[#1B4F72] transition-colors"
      aria-label={loggedIn ? 'Личный кабинет' : 'Войти'}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </Link>
  )
}
