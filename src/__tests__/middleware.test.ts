/**
 * @jest-environment node
 */

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@test.com' } }
      })
    }
  }))
}))

import { middleware } from '@/middleware'
import { NextRequest } from 'next/server'

function createRequest(path: string, options: { headers?: Record<string, string> } = {}): NextRequest {
  const url = new URL(path, 'http://localhost:3000')
  const headers = new Headers(options.headers || {})
  return new NextRequest(url, { headers })
}

describe('API Key Middleware', () => {
  const VALID_API_KEY = 'test-api-key-123'

  beforeAll(() => {
    process.env.INTERNAL_API_KEY = VALID_API_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  afterAll(() => {
    delete process.env.INTERNAL_API_KEY
  })

  it('returns 401 when X-API-Key header is missing on API routes', async () => {
    const request = createRequest('/api/calls/upload')
    const response = await middleware(request)
    expect(response.status).toBe(401)
  })

  it('returns 401 when X-API-Key is invalid', async () => {
    const request = createRequest('/api/calls/upload', {
      headers: { 'x-api-key': 'wrong-key' }
    })
    const response = await middleware(request)
    expect(response.status).toBe(401)
  })

  it('passes through when X-API-Key is valid', async () => {
    const request = createRequest('/api/calls/upload', {
      headers: { 'x-api-key': VALID_API_KEY }
    })
    const response = await middleware(request)
    expect(response.status).toBe(200)
  })

  it('does not apply API key check to non-API routes', async () => {
    const request = createRequest('/login')
    const response = await middleware(request)
    expect(response.status).not.toBe(401)
  })
})
