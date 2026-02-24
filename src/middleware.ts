import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import blobMap from '@/data/blob-map.json'

const PROTECTED_PATHS = ['/profile']

const blobUrls = blobMap as Record<string, string>

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Media file redirect: /api/media/file/{filename} → blob URL
  if (pathname.startsWith('/api/media/file/')) {
    const filename = pathname.replace('/api/media/file/', '')
    const blobUrl = blobUrls[decodeURIComponent(filename)]
    if (blobUrl) {
      return NextResponse.redirect(blobUrl, { status: 301 })
    }
    // Also check _next/image proxy requests
  }

  // Also handle /media/{filename} direct paths
  if (pathname.startsWith('/media/') && !pathname.startsWith('/media/file')) {
    const filename = pathname.replace('/media/', '')
    const blobUrl = blobUrls[decodeURIComponent(filename)]
    if (blobUrl) {
      return NextResponse.redirect(blobUrl, { status: 301 })
    }
  }

  // Check if the path requires authentication
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  // Payload CMS stores the auth token in a cookie named `payload-token`
  const token = request.cookies.get('payload-token')?.value

  if (!token) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/profile/:path*', '/api/media/file/:path*', '/media/:path*'],
}
