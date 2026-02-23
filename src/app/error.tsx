'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Что-то пошло не так</h1>
        <p className="text-gray-500 mb-8">
          Произошла непредвиденная ошибка. Попробуйте обновить страницу.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-[#1B4F72] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#163d5a] transition-colors"
          >
            Попробовать снова
          </button>
          <a
            href="/"
            className="border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-medium hover:border-gray-400 transition-colors"
          >
            На главную
          </a>
        </div>
      </div>
    </div>
  )
}
