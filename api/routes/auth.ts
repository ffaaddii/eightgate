/**
 * This is a user authentication API route demo.
 * Handle user registration, login, token management, etc.
 */
import { Router } from 'express'
import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import type { RowDataPacket } from 'mysql2/promise'
import { db } from '../db/pool.js'
import { signSession, SESSION_COOKIE_NAME, verifySession } from '../auth/session.js'
import type { Role } from '../auth/types.js'
import { requireAuth } from '../auth/middleware.js'
import { writeAudit } from '../audit/write.js'
import { asyncHandler } from '../http/asyncHandler.js'

type UserAuthRow = RowDataPacket & {
  id: string
  username: string
  display_name: string
  password_hash: string
  role: Role
  enabled: number
}

type DeviceRow = RowDataPacket & {
  id: string
  enabled: number
}

const router = Router()

/**
 * User Login
 * POST /api/auth/register
 */
router.post('/register', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  res.status(404).json({ success: false, error: 'NOT_FOUND' })
}))

/**
 * User Login
 * POST /api/auth/login
 */
router.post('/login', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    username: z.string().min(1).max(64),
    password: z.string().min(1).max(200),
    deviceId: z.string().min(6).max(64).optional(),
    deviceLabel: z.string().min(1).max(128).optional(),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'INVALID_BODY' })
    return
  }

  const { username, password, deviceId, deviceLabel } = parsed.data

  const [rows] = await db.query<UserAuthRow[]>(
    'SELECT id, username, display_name, password_hash, role, enabled FROM users WHERE username = :username LIMIT 1',
    { username },
  )

  const userRow = rows?.[0]
  if (!userRow || userRow.enabled !== 1) {
    await writeAudit({
      req,
      user: null,
      eventType: 'auth.login_failed',
      target: { type: 'user', id: username },
      summary: 'User not found or disabled',
    })
    res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS' })
    return
  }

  const ok = await bcrypt.compare(password, String(userRow.password_hash))
  if (!ok) {
    await writeAudit({
      req,
      user: null,
      eventType: 'auth.login_failed',
      target: { type: 'user', id: String(userRow.id) },
      summary: 'Invalid password',
    })
    res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS' })
    return
  }

  const enforceDevices = (process.env.DEVICE_ENFORCE ?? '0') === '1'
  if (enforceDevices) {
    if (!deviceId) {
      res.status(403).json({ success: false, error: 'DEVICE_REQUIRED' })
      return
    }
    const [deviceRows] = await db.query<DeviceRow[]>(
      'SELECT id, enabled FROM user_devices WHERE user_id = :user_id AND device_id = :device_id LIMIT 1',
      { user_id: String(userRow.id), device_id: deviceId },
    )
    const device = deviceRows?.[0]
    if (!device || device.enabled !== 1) {
      res.status(403).json({ success: false, error: 'DEVICE_NOT_APPROVED' })
      return
    }
  } else if (deviceId) {
    const [deviceRows] = await db.query<DeviceRow[]>(
      'SELECT id FROM user_devices WHERE user_id = :user_id AND device_id = :device_id LIMIT 1',
      { user_id: String(userRow.id), device_id: deviceId },
    )
    if (!deviceRows?.[0]) {
      await db.query(
        'INSERT INTO user_devices (id, user_id, device_id, label, enabled, approved_by) VALUES (:id, :user_id, :device_id, :label, :enabled, :approved_by)',
        {
          id: randomUUID(),
          user_id: String(userRow.id),
          device_id: deviceId,
          label: deviceLabel ?? null,
          enabled: 1,
          approved_by: String(userRow.id),
        },
      )
    }
  }

  const token = signSession({
    sub: String(userRow.id),
    username: String(userRow.username),
    role: userRow.role as Role,
  })

  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: (process.env.COOKIE_SECURE ?? '0') === '1',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  await writeAudit({
    req,
    user: { id: String(userRow.id), username: String(userRow.username), role: userRow.role as Role },
    eventType: 'auth.login',
    target: { type: 'user', id: String(userRow.id) },
    summary: 'Login success',
  })

  res.status(200).json({
    success: true,
    data: {
      id: String(userRow.id),
      username: String(userRow.username),
      displayName: String(userRow.display_name),
      role: userRow.role as Role,
    },
  })
}))

/**
 * User Logout
 * POST /api/auth/logout
 */
router.post('/logout', requireAuth, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  res.clearCookie(SESSION_COOKIE_NAME)
  await writeAudit({ req, user: req.user ?? null, eventType: 'auth.logout', summary: 'Logout' })
  res.status(200).json({ success: true })
}))

router.get('/me', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.[SESSION_COOKIE_NAME]
  if (!token || typeof token !== 'string') {
    res.status(200).json({ success: true, data: null })
    return
  }
  try {
    const payload = verifySession(token)
    res.status(200).json({
      success: true,
      data: { id: payload.sub, username: payload.username, role: payload.role },
    })
  } catch {
    res.status(200).json({ success: true, data: null })
  }
}))

export default router
