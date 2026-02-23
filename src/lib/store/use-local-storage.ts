'use client'

import { useState, useEffect, useCallback } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        setStoredValue(JSON.parse(item))
      }
    } catch {
      // localStorage unavailable or JSON parse error
    }
    setIsHydrated(true)
  }, [key])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value
        try {
          window.localStorage.setItem(key, JSON.stringify(newValue))
        } catch {
          // quota exceeded or unavailable
        }
        return newValue
      })
    },
    [key],
  )

  return [storedValue, setValue, isHydrated] as const
}
