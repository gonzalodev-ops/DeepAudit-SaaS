import { encryptApiKey, decryptApiKey } from '../keys'

// Set a valid 32-byte hex key for tests
const TEST_KEY = 'a'.repeat(64)

describe('encryptApiKey / decryptApiKey', () => {
  beforeAll(() => {
    process.env.TENANT_KEY_ENCRYPTION_KEY = TEST_KEY
  })

  afterAll(() => {
    delete process.env.TENANT_KEY_ENCRYPTION_KEY
  })

  it('roundtrip: decrypt(encrypt(key)) === key', () => {
    const original = 'sk-test-api-key-12345'
    const encrypted = encryptApiKey(original)
    const decrypted = decryptApiKey(encrypted)
    expect(decrypted).toBe(original)
  })

  it('different encryptions produce different ciphertexts (random IV)', () => {
    const original = 'sk-test-api-key-12345'
    const encrypted1 = encryptApiKey(original)
    const encrypted2 = encryptApiKey(original)
    expect(encrypted1).not.toBe(encrypted2)
    // But both decrypt to the same value
    expect(decryptApiKey(encrypted1)).toBe(original)
    expect(decryptApiKey(encrypted2)).toBe(original)
  })

  it('throws on invalid TENANT_KEY_ENCRYPTION_KEY', () => {
    const originalKey = process.env.TENANT_KEY_ENCRYPTION_KEY
    process.env.TENANT_KEY_ENCRYPTION_KEY = 'too-short'
    expect(() => encryptApiKey('test')).toThrow('TENANT_KEY_ENCRYPTION_KEY must be a 64-character hex string')
    process.env.TENANT_KEY_ENCRYPTION_KEY = originalKey
  })

  it('throws on tampered ciphertext (auth tag fails)', () => {
    const encrypted = encryptApiKey('test-key')
    const parts = encrypted.split(':')
    // Tamper with the ciphertext
    const tamperedCt = Buffer.from('tampered-data').toString('base64')
    const tampered = `${parts[0]}:${parts[1]}:${tamperedCt}`
    expect(() => decryptApiKey(tampered)).toThrow()
  })
})
