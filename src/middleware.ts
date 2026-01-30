import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // --- API routes: validate X-API-Key ---
  if (pathname.startsWith('/api/')) {
    const apiKey = request.headers.get('x-api-key')
    const validKey = process.env.INTERNAL_API_KEY

    if (!validKey) {
      console.error('INTERNAL_API_KEY not configured')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    if (!apiKey || apiKey !== validKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // API routes pass through — tenant_id comes from request body or is resolved server-side
    return NextResponse.next()
  }

  // --- Auth routes: allow without session ---
  if (pathname.startsWith('/login') || pathname.startsWith('/auth/')) {
    return NextResponse.next()
  }

  // --- Static assets and _next: pass through ---
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // --- Dashboard routes: require Supabase Auth session ---
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response = NextResponse.next({
              request: { headers: request.headers },
            })
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
