/**
 * Integration tests for API route integrity.
 *
 * Validates via source code inspection that:
 * - Routes use getTenantIdFromRequest (not DEMO_TENANT_ID)
 * - Upload stores filePath, not publicUrl
 * - Process validates path prefix
 * - Audio route applies tenant_id filter
 * - Unit economics queries processing_logs
 * - No DEMO_TENANT_ID in runtime code paths
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..', '..', '..')

function readSrc(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, 'src', relativePath), 'utf-8')
}

// ---------------------------------------------------------------------------
// Upload route
// ---------------------------------------------------------------------------

describe('Upload route (api/calls/upload)', () => {
  const source = readSrc('app/api/calls/upload/route.ts')

  it('uses getTenantIdFromRequest', () => {
    expect(source).toContain('getTenantIdFromRequest')
  })

  it('does NOT use DEMO_TENANT_ID', () => {
    expect(source).not.toContain('DEMO_TENANT_ID')
  })

  it('does NOT call getPublicUrl', () => {
    expect(source).not.toContain('getPublicUrl')
  })

  it('stores filePath in audio_url (not a URL)', () => {
    // Should assign filePath to audio_url
    expect(source).toMatch(/audio_url:\s*filePath/)
  })

  it('does NOT insert cost columns into audits', () => {
    // After migration, cost_usd, input_tokens etc should not be in audit insert
    expect(source).not.toMatch(/audits.*insert.*cost_usd/s)
    expect(source).not.toMatch(/audits.*insert.*input_tokens/s)
  })
})

// ---------------------------------------------------------------------------
// Process route
// ---------------------------------------------------------------------------

describe('Process route (api/calls/process)', () => {
  const source = readSrc('app/api/calls/process/route.ts')

  it('uses getTenantIdFromRequest', () => {
    expect(source).toContain('getTenantIdFromRequest')
  })

  it('does NOT use DEMO_TENANT_ID', () => {
    expect(source).not.toContain('DEMO_TENANT_ID')
  })

  it('validates path starts with tenantId', () => {
    expect(source).toMatch(/path\.startsWith.*tenantId/)
  })

  it('returns 403 for invalid path', () => {
    expect(source).toContain('403')
    expect(source).toContain('Invalid path')
  })
})

// ---------------------------------------------------------------------------
// Audio route
// ---------------------------------------------------------------------------

describe('Audio route (api/calls/[id]/audio)', () => {
  const source = readSrc('app/api/calls/[id]/audio/route.ts')

  it('uses getTenantIdFromRequest', () => {
    expect(source).toContain('getTenantIdFromRequest')
  })

  it('does NOT use DEMO_TENANT_ID', () => {
    expect(source).not.toContain('DEMO_TENANT_ID')
  })

  it('applies tenant_id filter on calls query', () => {
    expect(source).toContain("'tenant_id'")
  })

  it('uses createSignedUrl (not getPublicUrl)', () => {
    expect(source).toContain('createSignedUrl')
    expect(source).not.toContain('getPublicUrl')
  })
})

// ---------------------------------------------------------------------------
// Unit economics route
// ---------------------------------------------------------------------------

describe('Unit economics route (api/stats/unit-economics)', () => {
  const source = readSrc('app/api/stats/unit-economics/route.ts')

  it('uses getTenantIdFromRequest', () => {
    expect(source).toContain('getTenantIdFromRequest')
  })

  it('does NOT use DEMO_TENANT_ID', () => {
    expect(source).not.toContain('DEMO_TENANT_ID')
  })

  it('queries processing_logs table for costs', () => {
    expect(source).toContain("'processing_logs'")
  })

  it('does NOT query audits table for costs', () => {
    expect(source).not.toContain("from('audits')")
  })

  it('filters by tenant_id', () => {
    expect(source).toContain("'tenant_id'")
    expect(source).toContain('tenantId')
  })

  it('filters by completed status', () => {
    expect(source).toContain("'completed'")
  })

  it('checks showFinancialData feature flag', () => {
    expect(source).toContain('showFinancialData')
  })
})

// ---------------------------------------------------------------------------
// Regenerate route
// ---------------------------------------------------------------------------

describe('Regenerate route (api/calls/[id]/regenerate)', () => {
  const source = readSrc('app/api/calls/[id]/regenerate/route.ts')

  it('does NOT insert cost_usd into audits', () => {
    // After migration, these fields were removed from audits table
    const insertSection = source.slice(source.indexOf('.insert('))
    expect(insertSection).not.toContain('cost_usd')
    expect(insertSection).not.toContain('input_tokens')
    expect(insertSection).not.toContain('output_tokens')
    expect(insertSection).not.toContain('total_tokens')
  })
})

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

describe('Dashboard page cost queries', () => {
  const source = readSrc('app/(dashboard)/page.tsx')

  it('queries processing_logs for cost data', () => {
    expect(source).toContain("from('processing_logs')")
  })

  it('does NOT query audits for cost_usd', () => {
    // audits query should only select score and call_id, not cost fields
    const auditsQuery = source.match(/from\('audits'\)[\s\S]*?\.select\(['"`]([^'"`]+)['"`]\)/)?.[1] || ''
    expect(auditsQuery).not.toContain('cost_usd')
    expect(auditsQuery).not.toContain('input_tokens')
    expect(auditsQuery).not.toContain('output_tokens')
  })
})

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

describe('Middleware tenant propagation', () => {
  const source = readSrc('middleware.ts')

  it('imports resolveTenant', () => {
    expect(source).toContain('resolveTenant')
  })

  it('sets x-tenant-id header', () => {
    expect(source).toContain('x-tenant-id')
  })

  it('allows auth routes without API key', () => {
    expect(source).toContain('/api/auth/')
  })

  it('allows login and signup pages', () => {
    expect(source).toContain('/login')
    expect(source).toContain('/signup')
  })
})

// ---------------------------------------------------------------------------
// No DEMO_TENANT_ID in runtime API routes
// ---------------------------------------------------------------------------

describe('DEMO_TENANT_ID removal from all API routes', () => {
  const apiRoutes = [
    'app/api/calls/upload/route.ts',
    'app/api/calls/process/route.ts',
    'app/api/calls/[id]/audio/route.ts',
    'app/api/stats/unit-economics/route.ts',
  ]

  apiRoutes.forEach((route) => {
    it(`${route} does not import or use DEMO_TENANT_ID`, () => {
      const source = readSrc(route)
      expect(source).not.toContain('DEMO_TENANT_ID')
    })
  })
})
