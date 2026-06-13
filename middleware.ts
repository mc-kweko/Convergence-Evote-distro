import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const { pathname } = request.nextUrl

  // ── Security headers (all routes) ──────────────────────────────────────
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline/eval in dev
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co",
      "frame-ancestors 'none'",
    ].join('; ')
  )

  // ── Voter route guard: /vote requires voter_session cookie ──────────────
  if (pathname === '/vote') {
    const voterSession = request.cookies.get('voter_session')
    if (!voterSession) {
      return NextResponse.redirect(new URL('/voting', request.url))
    }
  }

  // ── Admin route guard: /dashboard requires admin_session_token cookie ──
  if (pathname.startsWith('/dashboard')) {
    const adminSession = request.cookies.get('admin_session_token')
    if (!adminSession) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)',
  ],
}
