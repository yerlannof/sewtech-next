'use client'

import { useState, useEffect } from 'react'

interface FilterBottomSheetProps {
  children: React.ReactNode
  activeCount: number
}

export function FilterBottomSheet({ children, activeCount }: FilterBottomSheetProps) {
  const [open, setOpen] = useState(false)

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
        className="lg:hidden flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-[#1B4F72] transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Фильтры
        {activeCount > 0 && (
          <span className="bg-[#1B4F72] text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Фильтры</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {children}
            </div>
            <div className="border-t p-4">
              <button
                onClick={() => setOpen(false)}
                className="w-full bg-[#1B4F72] text-white font-medium py-3 rounded-xl"
              >
                Показать результаты
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
