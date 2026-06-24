import { describe, expect, it } from 'vitest'
import { signSession, verifySession } from './session.js'

describe('session token', () => {
  it('signs and verifies session payload', () => {
    process.env.AUTH_JWT_SECRET = 'test-secret'
    const token = signSession({ sub: 'u1', username: 'x', role: 'superadmin' })
    const payload = verifySession(token)
    expect(payload.sub).toBe('u1')
    expect(payload.username).toBe('x')
    expect(payload.role).toBe('superadmin')
  })
})

