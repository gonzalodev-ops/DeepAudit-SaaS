import { createServiceClient } from '@/lib/supabase/server'

export interface TenantContext {
  tenantId: string
  tenantName: string
  pipelineType: 'legacy' | 'callfast'
}

// Hardcoded map for POC — will be replaced by DB lookup in MVP
const HOSTNAME_MAP: Record<string, TenantContext> = {
  'localhost:3000': {
    tenantId: '00000000-0000-0000-0000-000000000001',
    tenantName: 'DeepAudit Demo',
    pipelineType: 'legacy',
  },
  'app.deepaudit.com': {
    tenantId: '00000000-0000-0000-0000-000000000001',
    tenantName: 'DeepAudit',
    pipelineType: 'legacy',
  },
}

export async function resolveTenant(hostname: string): Promise<TenantContext | null> {
  // First check hardcoded map (fast path for POC)
  const mapped = HOSTNAME_MAP[hostname]
  if (mapped) return mapped

  // Fallback: lookup in tenant_domains table
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('tenant_domains')
      .select('tenant_id, tenants(name, pipeline_type)')
      .eq('hostname', hostname)
      .single()

    if (!data) return null

    const tenant = data.tenants as unknown as { name: string; pipeline_type: string } | null
    return {
      tenantId: data.tenant_id,
      tenantName: tenant?.name || 'Unknown',
      pipelineType: (tenant?.pipeline_type as 'legacy' | 'callfast') || 'legacy',
    }
  } catch {
    return null
  }
}

export function getDefaultTenantId(): string {
  return '00000000-0000-0000-0000-000000000001'
}
