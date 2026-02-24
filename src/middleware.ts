import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import blobMap from '@/data/blob-map.json'

const PROTECTED_PATHS = ['/profile']

const blobUrls = blobMap as Record<string, string>

// Build a lowercase lookup map for case-insensitive matching
const blobUrlsLower: Record<string, string> = {}
for (const [key, val] of Object.entries(blobUrls)) {
  blobUrlsLower[key.toLowerCase()] = val
}

function findBlobUrl(filename: string): string | undefined {
  const decoded = decodeURIComponent(filename)
  return blobUrls[decoded] || blobUrlsLower[decoded.toLowerCase()]
}

// 1x1 transparent PNG as placeholder for missing images
const PLACEHOLDER_URL = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22 fill=%22%23f3f4f6%22%3E%3Crect width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2216%22%3ENo image%3C/text%3E%3C/svg%3E'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Media file redirect: /api/media/file/{filename} → blob URL
  if (pathname.startsWith('/api/media/file/')) {
    const filename = pathname.replace('/api/media/file/', '')
    const blobUrl = findBlobUrl(filename)
    if (blobUrl) {
      return NextResponse.redirect(blobUrl, { status: 301 })
    }
    // Return placeholder SVG for missing images instead of 500
    return NextResponse.redirect(PLACEHOLDER_URL, { status: 302 })
  }

  // Also handle /media/{filename} direct paths
  if (pathname.startsWith('/media/') && !pathname.startsWith('/media/file')) {
    const filename = pathname.replace('/media/', '')
    const blobUrl = findBlobUrl(filename)
    if (blobUrl) {
      return NextResponse.redirect(blobUrl, { status: 301 })
    }
    return NextResponse.redirect(PLACEHOLDER_URL, { status: 302 })
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
