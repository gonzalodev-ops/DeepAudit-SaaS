/**
 * Tests for Feature Flags
 */

describe('Feature Flags', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('getProductMode', () => {
    it('returns "standard" by default when env is not set', async () => {
      delete process.env.NEXT_PUBLIC_PRODUCT_MODE
      const { getProductMode } = await import('@/lib/feature-flags')
      expect(getProductMode()).toBe('standard')
    })

    it('returns "enterprise" when env is set to enterprise', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'enterprise'
      const { getProductMode } = await import('@/lib/feature-flags')
      expect(getProductMode()).toBe('enterprise')
    })

    it('returns "standard" when env is set to standard', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'standard'
      const { getProductMode } = await import('@/lib/feature-flags')
      expect(getProductMode()).toBe('standard')
    })
  })

  describe('isEnterpriseMode', () => {
    it('returns false in standard mode', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'standard'
      const { isEnterpriseMode } = await import('@/lib/feature-flags')
      expect(isEnterpriseMode()).toBe(false)
    })

    it('returns true in enterprise mode', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'enterprise'
      const { isEnterpriseMode } = await import('@/lib/feature-flags')
      expect(isEnterpriseMode()).toBe(true)
    })
  })

  describe('getBranding', () => {
    it('returns correct name for standard mode', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'standard'
      const { getBranding } = await import('@/lib/feature-flags')
      const branding = getBranding()
      expect(branding.name).toBe('DeepAudit')
    })

    it('returns correct name for enterprise mode', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'enterprise'
      const { getBranding } = await import('@/lib/feature-flags')
      const branding = getBranding()
      expect(branding.name).toBe('DeepAudit Enterprise')
    })

    it('returns correct subtitle for enterprise mode', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'enterprise'
      const { getBranding } = await import('@/lib/feature-flags')
      const branding = getBranding()
      expect(branding.subtitle).toContain('CallFasst Intelligence')
    })

    it('returns shield logo for enterprise mode', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'enterprise'
      const { getBranding } = await import('@/lib/feature-flags')
      const branding = getBranding()
      expect(branding.logo).toBe('shield')
    })

    it('returns file-audio logo for standard mode', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'standard'
      const { getBranding } = await import('@/lib/feature-flags')
      const branding = getBranding()
      expect(branding.logo).toBe('file-audio')
    })
  })

  describe('getProductMode - poc', () => {
    it('returns "poc" when env is set to poc', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'poc'
      const { getProductMode } = await import('@/lib/feature-flags')
      expect(getProductMode()).toBe('poc')
    })
  })

  describe('isPocMode', () => {
    it('returns true in poc mode', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'poc'
      const { isPocMode } = await import('@/lib/feature-flags')
      expect(isPocMode()).toBe(true)
    })

    it('returns false in standard mode', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'standard'
      const { isPocMode } = await import('@/lib/feature-flags')
      expect(isPocMode()).toBe(false)
    })

    it('returns false in enterprise mode', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'enterprise'
      const { isPocMode } = await import('@/lib/feature-flags')
      expect(isPocMode()).toBe(false)
    })
  })

  describe('showFinancialData', () => {
    it('returns false in poc mode', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'poc'
      const { showFinancialData } = await import('@/lib/feature-flags')
      expect(showFinancialData()).toBe(false)
    })

    it('returns true in standard mode', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'standard'
      const { showFinancialData } = await import('@/lib/feature-flags')
      expect(showFinancialData()).toBe(true)
    })

    it('returns true in enterprise mode', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'enterprise'
      const { showFinancialData } = await import('@/lib/feature-flags')
      expect(showFinancialData()).toBe(true)
    })
  })

  describe('getBranding - poc', () => {
    it('returns PoC subtitle', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'poc'
      const { getBranding } = await import('@/lib/feature-flags')
      const branding = getBranding()
      expect(branding.subtitle).toBe('Prueba de Concepto')
    })

    it('returns file-audio logo for poc mode', async () => {
      process.env.NEXT_PUBLIC_PRODUCT_MODE = 'poc'
      const { getBranding } = await import('@/lib/feature-flags')
      const branding = getBranding()
      expect(branding.logo).toBe('file-audio')
    })
  })

  describe('getEnterpriseConfig', () => {
    it('returns default LTV of 5000', async () => {
      const { getEnterpriseConfig } = await import('@/lib/feature-flags')
      const config = getEnterpriseConfig()
      expect(config.defaultLTV).toBe(5000)
    })

    it('returns human audit percentage of 1.5', async () => {
      const { getEnterpriseConfig } = await import('@/lib/feature-flags')
      const config = getEnterpriseConfig()
      expect(config.humanAuditPercentage).toBe(1.5)
    })

    it('returns AI audit percentage of 100', async () => {
      const { getEnterpriseConfig } = await import('@/lib/feature-flags')
      const config = getEnterpriseConfig()
      expect(config.aiAuditPercentage).toBe(100)
    })
  })
})
