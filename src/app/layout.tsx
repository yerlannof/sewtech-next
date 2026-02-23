import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@/components/Analytics'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: {
    default: 'SEWTECH — Промышленные швейные машины в Алматы',
    template: '%s | SEWTECH',
  },
  description: 'Официальный дилер JUKI в Казахстане. Промышленные швейные машины, оверлоки, запчасти. Доставка по Казахстану.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    siteName: 'SEWTECH',
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
