import { safeConfigSnapshot, sanitizeErrorMessage } from '../logger'

describe('safeConfigSnapshot', () => {
  it('only keeps allowed keys', () => {
    const config = {
      threshold_seconds: 30,
      processing_mode: 'full',
      pipeline_type: 'callfast',
      api_key: 'sk-secret-123',
      password: 'secret',
    }
    const result = safeConfigSnapshot(config)
    expect(result).toEqual({
      threshold_seconds: 30,
      processing_mode: 'full',
      pipeline_type: 'callfast',
    })
    expect(result).not.toHaveProperty('api_key')
    expect(result).not.toHaveProperty('password')
  })

  it('strips api_key, password, secret fields', () => {
    const config = {
      api_key: 'secret',
      gemini_api_key: 'secret',
      password: 'secret',
      secret_token: 'secret',
    }
    const result = safeConfigSnapshot(config)
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('handles empty config', () => {
    expect(safeConfigSnapshot({})).toEqual({})
  })
})

describe('sanitizeErrorMessage', () => {
  it('redacts API keys from error messages', () => {
    const msg = 'Error: api key= sk-12345-secret failed'
    const result = sanitizeErrorMessage(msg)
    expect(result).not.toContain('sk-12345-secret')
    expect(result).toContain('[REDACTED]')
  })

  it('redacts Bearer tokens', () => {
    const msg = 'Authorization failed: Bearer eyJhbGciOiJIUzI1NiJ9.test'
    const result = sanitizeErrorMessage(msg)
    expect(result).not.toContain('eyJhbGciOiJIUzI1NiJ9')
    expect(result).toContain('Bearer [REDACTED]')
  })

  it('truncates to 500 chars', () => {
    const msg = 'x'.repeat(1000)
    const result = sanitizeErrorMessage(msg)
    expect(result.length).toBe(500)
  })
})
