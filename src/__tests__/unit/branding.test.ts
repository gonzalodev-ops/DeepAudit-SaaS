/**
 * Tests para verificar que el branding no contiene "Demo"
 */

import { getBranding, isEnterpriseMode } from '@/lib/feature-flags'

describe('Branding Validation', () => {
  describe('Enterprise Mode Branding', () => {
    beforeAll(() => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'enterprise'
    })

    afterAll(() => {
      delete process.env.NEXT_PUBLIC_PRODUCT_MODE
    })

    test('El nombre debe ser "DeepAudit Enterprise"', () => {
      const branding = getBranding()
      expect(branding.name).toBe('DeepAudit Enterprise')
    })

    test('El subtítulo NO debe contener la palabra "Demo"', () => {
      const branding = getBranding()
      expect(branding.subtitle.toLowerCase()).not.toContain('demo')
    })

    test('El subtítulo debe contener "CallFasst Intelligence"', () => {
      const branding = getBranding()
      expect(branding.subtitle).toContain('CallFasst Intelligence')
    })

    test('El logo debe ser "shield" en modo Enterprise', () => {
      const branding = getBranding()
      expect(branding.logo).toBe('shield')
    })
  })

  describe('Standard Mode Branding', () => {
    beforeAll(() => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'standard'
    })

    afterAll(() => {
      delete process.env.NEXT_PUBLIC_PRODUCT_MODE
    })

    test('El nombre debe ser "DeepAudit"', () => {
      const branding = getBranding()
      expect(branding.name).toBe('DeepAudit')
    })

    test('El logo debe ser "file-audio" en modo Standard', () => {
      const branding = getBranding()
      expect(branding.logo).toBe('file-audio')
    })
  })
})
