import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

export interface AuthContext {
  userId: string
  authId: string
  tenantId: string
  email: string
  fullName: string | null
  role: 'admin' | 'supervisor' | 'agent'
}

export async function getAuthContext(): Promise<AuthContext | null> {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // Read-only in server components
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Look up the user in our users table to get tenant_id and role
    const serviceClient = await createServiceClient()
    const { data: dbUser } = await serviceClient
      .from('users')
      .select('id, tenant_id, email, full_name, role')
      .eq('auth_id', user.id)
      .single()

    if (!dbUser || !dbUser.tenant_id) return null

    return {
      userId: dbUser.id,
      authId: user.id,
      tenantId: dbUser.tenant_id,
      email: dbUser.email,
      fullName: dbUser.full_name,
      role: dbUser.role as 'admin' | 'supervisor' | 'agent',
    }
  } catch {
    return null
  }
}

/**
 * Get tenant_id from API request header (set by middleware or passed by client).
 * Falls back to default tenant for backward compatibility during migration.
 */
export function getTenantIdFromRequest(request: Request): string {
  const tenantId = request.headers.get('x-tenant-id')
  if (tenantId) return tenantId
  // Fallback for backward compatibility
  return '00000000-0000-0000-0000-000000000001'
}
