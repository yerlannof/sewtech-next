import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/profile']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
  matcher: ['/profile/:path*'],
}
