import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../db/env.js'
import type { Role } from './types.js'

export const SESSION_COOKIE_NAME = 'eg_session'

type SessionTokenPayload = {
  sub: string
  username: string
  role: Role
}

export function signSession(payload: SessionTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function verifySession(token: string): SessionTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret())
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token')
  }
  const p = decoded as Partial<SessionTokenPayload>
  if (!p.sub || !p.username || !p.role) throw new Error('Invalid token')
  return p as SessionTokenPayload
}

