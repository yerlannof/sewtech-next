import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const nextConfig: NextConfig = {
  images: {
    quality: 90,
    formats: ['image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.juki.co.jp',
      },
      {
        protocol: 'https',
        hostname: 'sewtech.kz',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
  async redirects() {
    const filePath = resolve(process.cwd(), 'data/redirects.json')
    if (!existsSync(filePath)) return []
    try {
      const data = JSON.parse(readFileSync(filePath, 'utf-8'))
      return data as Array<{ source: string; destination: string; permanent: boolean }>
    } catch {
      return []
    }
  },
}

export default withPayload(nextConfig)
