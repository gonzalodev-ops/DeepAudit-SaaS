jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn().mockResolvedValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    })
  })
}))

import { resolveTenant, getDefaultTenantId } from '@/lib/auth/tenant-resolver'

describe('resolveTenant', () => {
  it('resolves localhost:3000 to demo tenant', async () => {
    const result = await resolveTenant('localhost:3000')
    expect(result).not.toBeNull()
    expect(result!.tenantId).toBe('00000000-0000-0000-0000-000000000001')
    expect(result!.tenantName).toBe('DeepAudit Demo')
    expect(result!.pipelineType).toBe('legacy')
  })

  it('resolves app.deepaudit.com to demo tenant', async () => {
    const result = await resolveTenant('app.deepaudit.com')
    expect(result).not.toBeNull()
    expect(result!.tenantId).toBe('00000000-0000-0000-0000-000000000001')
  })

  it('returns null for unknown hostname', async () => {
    const result = await resolveTenant('unknown.example.com')
    expect(result).toBeNull()
  })

  it('handles localhost for development', async () => {
    const result = await resolveTenant('localhost:3000')
    expect(result).not.toBeNull()
    expect(result!.pipelineType).toBe('legacy')
  })
})

describe('getDefaultTenantId', () => {
  it('returns the demo tenant ID', () => {
    expect(getDefaultTenantId()).toBe('00000000-0000-0000-0000-000000000001')
  })
})
