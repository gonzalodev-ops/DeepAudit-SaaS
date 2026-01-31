/**
 * Integration tests: Cost Data Migration Integrity
 *
 * Validates that cost-related fields (cost_usd, input_tokens, output_tokens, total_tokens)
 * have been fully migrated from the `audits` table to `processing_logs`, and that all
 * application code references the correct table.
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..', '..', '..')

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8')
}

describe('Cost data migration integrity', () => {
  // -------------------------------------------------------------------------
  // 1. Database types: Audit type does NOT have cost columns
  // -------------------------------------------------------------------------
  describe('Audit type in database.ts', () => {
    const src = readSource('src/types/database.ts')

    // Extract the audits table block (Row, Insert, Update) from the Database interface
    const auditsBlock = src.slice(
      src.indexOf("audits: {"),
      src.indexOf("campaigns: {")
    )

    it('should NOT contain cost_usd field', () => {
      expect(auditsBlock).not.toMatch(/cost_usd/)
    })

    it('should NOT contain input_tokens field', () => {
      expect(auditsBlock).not.toMatch(/input_tokens/)
    })

    it('should NOT contain output_tokens field', () => {
      expect(auditsBlock).not.toMatch(/output_tokens/)
    })

    it('should NOT contain total_tokens field', () => {
      expect(auditsBlock).not.toMatch(/total_tokens/)
    })
  })

  // -------------------------------------------------------------------------
  // 2. Database types: ProcessingLog type DOES have cost columns
  // -------------------------------------------------------------------------
  describe('ProcessingLog type in database.ts', () => {
    const src = readSource('src/types/database.ts')

    const processingLogsBlock = src.slice(
      src.indexOf("processing_logs: {"),
      src.indexOf("tenant_domains: {")
    )

    it('should contain cost_usd field', () => {
      expect(processingLogsBlock).toMatch(/cost_usd:\s*(number\s*\|\s*null)/)
    })

    it('should contain input_tokens field', () => {
      expect(processingLogsBlock).toMatch(/input_tokens:\s*(number\s*\|\s*null)/)
    })

    it('should contain output_tokens field', () => {
      expect(processingLogsBlock).toMatch(/output_tokens:\s*(number\s*\|\s*null)/)
    })
  })

  // -------------------------------------------------------------------------
  // 3. Dashboard page: getStats queries processing_logs for cost data
  // -------------------------------------------------------------------------
  describe('Dashboard page (getStats)', () => {
    const src = readSource('src/app/(dashboard)/page.tsx')

    it('should query processing_logs for cost data', () => {
      expect(src).toMatch(/from\(\s*['"]processing_logs['"]\s*\)/)
    })

    it('should select cost_usd from processing_logs', () => {
      // The select call on processing_logs should include cost_usd
      const processingLogsQuery = src.match(
        /from\(\s*['"]processing_logs['"]\s*\)\s*\.\s*select\(\s*['"]([^'"]+)['"]\s*\)/
      )
      expect(processingLogsQuery).not.toBeNull()
      expect(processingLogsQuery![1]).toContain('cost_usd')
    })

    it('should select input_tokens from processing_logs', () => {
      const processingLogsQuery = src.match(
        /from\(\s*['"]processing_logs['"]\s*\)\s*\.\s*select\(\s*['"]([^'"]+)['"]\s*\)/
      )
      expect(processingLogsQuery).not.toBeNull()
      expect(processingLogsQuery![1]).toContain('input_tokens')
    })

    it('should select output_tokens from processing_logs', () => {
      const processingLogsQuery = src.match(
        /from\(\s*['"]processing_logs['"]\s*\)\s*\.\s*select\(\s*['"]([^'"]+)['"]\s*\)/
      )
      expect(processingLogsQuery).not.toBeNull()
      expect(processingLogsQuery![1]).toContain('output_tokens')
    })

    it('should NOT query audits table for cost_usd', () => {
      // Find lines that query the audits table and ensure none select cost_usd
      const auditsSelects = src.match(
        /from\(\s*['"]audits['"]\s*\)\s*\.\s*select\(\s*['"]([^'"]+)['"]\s*\)/g
      ) || []
      for (const selectCall of auditsSelects) {
        expect(selectCall).not.toContain('cost_usd')
        expect(selectCall).not.toContain('input_tokens')
        expect(selectCall).not.toContain('output_tokens')
      }
    })
  })

  // -------------------------------------------------------------------------
  // 4. Call detail page: fetches cost data from processing_logs
  // -------------------------------------------------------------------------
  describe('Call detail page', () => {
    const src = readSource('src/app/(dashboard)/calls/[id]/page.tsx')

    it('should query processing_logs for cost data', () => {
      expect(src).toMatch(/from\(\s*['"]processing_logs['"]\s*\)/)
    })

    it('should select cost_usd, input_tokens, output_tokens from processing_logs', () => {
      const processingLogsQuery = src.match(
        /from\(\s*['"]processing_logs['"]\s*\)\s*\.\s*select\(\s*['"]([^'"]+)['"]\s*\)/
      )
      expect(processingLogsQuery).not.toBeNull()
      const selectFields = processingLogsQuery![1]
      expect(selectFields).toContain('cost_usd')
      expect(selectFields).toContain('input_tokens')
      expect(selectFields).toContain('output_tokens')
    })
  })

  // -------------------------------------------------------------------------
  // 5. Regenerate route: audit insert does NOT include cost columns
  // -------------------------------------------------------------------------
  describe('Regenerate route', () => {
    const src = readSource('src/app/api/calls/[id]/regenerate/route.ts')

    it('should NOT include cost_usd in audit data object', () => {
      // Extract the auditData object literal
      const auditDataMatch = src.match(/const\s+auditData\s*=\s*\{([\s\S]*?)\}/)
      expect(auditDataMatch).not.toBeNull()
      const auditDataBody = auditDataMatch![1]
      expect(auditDataBody).not.toContain('cost_usd')
    })

    it('should NOT include input_tokens in audit data object', () => {
      const auditDataMatch = src.match(/const\s+auditData\s*=\s*\{([\s\S]*?)\}/)
      expect(auditDataMatch).not.toBeNull()
      expect(auditDataMatch![1]).not.toContain('input_tokens')
    })

    it('should NOT include output_tokens in audit data object', () => {
      const auditDataMatch = src.match(/const\s+auditData\s*=\s*\{([\s\S]*?)\}/)
      expect(auditDataMatch).not.toBeNull()
      expect(auditDataMatch![1]).not.toContain('output_tokens')
    })

    it('should NOT include total_tokens in audit data object', () => {
      const auditDataMatch = src.match(/const\s+auditData\s*=\s*\{([\s\S]*?)\}/)
      expect(auditDataMatch).not.toBeNull()
      expect(auditDataMatch![1]).not.toContain('total_tokens')
    })
  })
})
