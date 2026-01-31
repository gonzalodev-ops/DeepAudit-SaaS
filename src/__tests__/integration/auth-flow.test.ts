/**
 * Integration tests for auth flow integrity.
 *
 * Validates via source code inspection that:
 * - Auth callback exchanges code for session
 * - Logout calls signOut and redirects
 * - getAuthContext handles errors properly
 * - getTenantIdFromRequest reads header with fallback
 * - All auth pages exist and have correct structure
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..', '..', '..')

function readSrc(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, 'src', relativePath), 'utf-8')
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, 'src', relativePath))
}

// ---------------------------------------------------------------------------
// Auth callback route
// ---------------------------------------------------------------------------

describe('Auth callback route (/auth/callback)', () => {
  const source = readSrc('app/auth/callback/route.ts')

  it('exists as a route file', () => {
    expect(fileExists('app/auth/callback/route.ts')).toBe(true)
  })

  it('exports a GET handler', () => {
    expect(source).toMatch(/export\s+async\s+function\s+GET/)
  })

  it('reads code from searchParams', () => {
    expect(source).toMatch(/searchParams.*get.*['"]code['"]/)
  })

  it('calls exchangeCodeForSession', () => {
    expect(source).toContain('exchangeCodeForSession')
  })

  it('redirects on success (NextResponse.redirect)', () => {
    expect(source).toContain('NextResponse.redirect')
  })

  it('handles missing code (error path)', () => {
    // Should redirect to /login with error when no code
    expect(source).toContain('/login')
  })
})

// ---------------------------------------------------------------------------
// Logout route
// ---------------------------------------------------------------------------

describe('Logout route (/api/auth/logout)', () => {
  const source = readSrc('app/api/auth/logout/route.ts')

  it('exists as a route file', () => {
    expect(fileExists('app/api/auth/logout/route.ts')).toBe(true)
  })

  it('exports a POST handler', () => {
    expect(source).toMatch(/export\s+async\s+function\s+POST/)
  })

  it('calls signOut', () => {
    expect(source).toContain('signOut')
  })

  it('redirects to /login', () => {
    expect(source).toContain('/login')
    expect(source).toContain('redirect')
  })
})

// ---------------------------------------------------------------------------
// getAuthContext (session.ts)
// ---------------------------------------------------------------------------

describe('getAuthContext (session.ts)', () => {
  const source = readSrc('lib/auth/session.ts')

  it('exports getAuthContext function', () => {
    expect(source).toMatch(/export\s+(async\s+)?function\s+getAuthContext/)
  })

  it('calls getUser to check session', () => {
    expect(source).toContain('getUser')
  })

  it('queries users table by auth_id', () => {
    expect(source).toContain("from('users')")
    expect(source).toContain('auth_id')
  })

  it('handles .single() error (returns null on DB error)', () => {
    // Must destructure error from .single() call
    expect(source).toContain('dbError')
    expect(source).toContain('.single()')
    // Must check for error or null dbUser
    expect(source).toContain('if (dbError || !dbUser')
  })

  it('checks for null tenant_id', () => {
    expect(source).toContain('tenant_id')
    // Should return null when tenant_id is missing
    expect(source).toMatch(/!dbUser\.tenant_id|tenant_id.*null/)
  })

  it('returns AuthContext with flat fields (not nested user object)', () => {
    // Should have fullName, not user.full_name
    expect(source).toContain('fullName')
    expect(source).toContain('tenantId')
    expect(source).toContain('authId')
  })
})

// ---------------------------------------------------------------------------
// getTenantIdFromRequest (session.ts)
// ---------------------------------------------------------------------------

describe('getTenantIdFromRequest (session.ts)', () => {
  const source = readSrc('lib/auth/session.ts')

  it('exports getTenantIdFromRequest function', () => {
    expect(source).toMatch(/export\s+function\s+getTenantIdFromRequest/)
  })

  it('reads x-tenant-id header', () => {
    expect(source).toContain('x-tenant-id')
  })

  it('has a fallback default UUID', () => {
    expect(source).toContain('00000000-0000-0000-0000-000000000001')
  })
})

// ---------------------------------------------------------------------------
// Auth pages exist
// ---------------------------------------------------------------------------

describe('Auth pages completeness', () => {
  it('login page exists', () => {
    expect(fileExists('app/(auth)/login/page.tsx')).toBe(true)
  })

  it('signup page exists', () => {
    expect(fileExists('app/(auth)/signup/page.tsx')).toBe(true)
  })

  it('forgot-password page exists', () => {
    expect(fileExists('app/(auth)/forgot-password/page.tsx')).toBe(true)
  })

  it('reset-password page exists', () => {
    expect(fileExists('app/(auth)/reset-password/page.tsx')).toBe(true)
  })

  it('login page links to signup', () => {
    const login = readSrc('app/(auth)/login/page.tsx')
    expect(login).toContain('/signup')
  })

  it('login page links to forgot-password', () => {
    const login = readSrc('app/(auth)/login/page.tsx')
    expect(login).toContain('/forgot-password')
  })

  it('signup page uses supabase signUp', () => {
    const signup = readSrc('app/(auth)/signup/page.tsx')
    expect(signup).toContain('signUp')
  })

  it('forgot-password page uses resetPasswordForEmail', () => {
    const forgot = readSrc('app/(auth)/forgot-password/page.tsx')
    expect(forgot).toContain('resetPasswordForEmail')
  })

  it('reset-password page uses updateUser', () => {
    const reset = readSrc('app/(auth)/reset-password/page.tsx')
    expect(reset).toContain('updateUser')
  })
})

// ---------------------------------------------------------------------------
// Sidebar has logout
// ---------------------------------------------------------------------------

describe('Sidebar logout integration', () => {
  const source = readSrc('components/dashboard/sidebar.tsx')

  it('has logout action pointing to /api/auth/logout', () => {
    expect(source).toContain('/api/auth/logout')
  })

  it('accepts userName and userEmail props', () => {
    expect(source).toContain('userName')
    expect(source).toContain('userEmail')
  })
})

// ---------------------------------------------------------------------------
// Dashboard layout passes auth context
// ---------------------------------------------------------------------------

describe('Dashboard layout auth wiring', () => {
  const source = readSrc('app/(dashboard)/layout.tsx')

  it('calls getAuthContext', () => {
    expect(source).toContain('getAuthContext')
  })

  it('passes user info to Sidebar', () => {
    expect(source).toContain('userName')
    expect(source).toContain('userEmail')
  })

  it('uses authContext.fullName (not authContext.user.full_name)', () => {
    expect(source).toContain('authContext?.fullName')
    expect(source).not.toContain('authContext?.user?.full_name')
  })
})

// ---------------------------------------------------------------------------
// Migration has user creation trigger
// ---------------------------------------------------------------------------

describe('Migration: user creation trigger', () => {
  const migration = fs.readFileSync(
    path.join(ROOT, 'docs/migrations/006_security_and_callfast.sql'),
    'utf-8'
  )

  it('creates handle_new_user function', () => {
    expect(migration).toContain('handle_new_user')
  })

  it('creates trigger on auth.users', () => {
    expect(migration).toContain('on_auth_user_created')
    expect(migration).toContain('auth.users')
  })

  it('inserts into public.users table', () => {
    expect(migration).toContain('INSERT INTO public.users')
  })
})
