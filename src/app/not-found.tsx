import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#1B4F72] mb-4">404</h1>
        <h2 className="text-2xl font-medium text-gray-700 mb-4">Страница не найдена</h2>
        <p className="text-gray-500 mb-8">Возможно, страница была перемещена или удалена</p>
        <div className="flex gap-4 justify-center">
          <Link href="/" className="bg-[#1B4F72] text-white px-6 py-3 rounded-lg hover:bg-[#163d5a] transition font-medium">
            На главную
          </Link>
          <Link href="/catalog" className="border border-[#1B4F72] text-[#1B4F72] px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium">
            Каталог
          </Link>
        </div>
      </div>
    </div>
  )
}
