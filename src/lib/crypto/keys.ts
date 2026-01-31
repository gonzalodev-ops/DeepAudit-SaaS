import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const keyHex = process.env.TENANT_KEY_ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('TENANT_KEY_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
  }
  return Buffer.from(keyHex, 'hex')
}

export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptApiKey(stored: string): string {
  const key = getEncryptionKey()
  const parts = stored.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted key format')
  }
  const [ivB64, tagB64, ctB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const ciphertext = Buffer.from(ctB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}
