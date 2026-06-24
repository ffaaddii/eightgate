import { Router } from 'express'
import type { Request, Response } from 'express-serve-static-core'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { db } from '../db/pool.js'
import { requireAuth, requirePermission } from '../auth/middleware.js'
import type { Role } from '../auth/types.js'
import { writeAudit } from '../audit/write.js'
import { asyncHandler } from '../http/asyncHandler.js'

type UserRow = RowDataPacket & {
  id: string
  username: string
  display_name: string
  role: Role
  enabled: number
  created_at: string
  updated_at: string
}

const router = Router()

router.use(requireAuth)
router.use(requirePermission('users:read'))

router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const [rows] = await db.query<UserRow[]>(
    'SELECT id, username, display_name, role, enabled, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT 500',
  )
  res.status(200).json({
    success: true,
    data: rows.map((r) => ({
      id: String(r.id),
      username: String(r.username),
      displayName: String(r.display_name),
      role: r.role as Role,
      enabled: r.enabled === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  })
}))

router.post('/', requirePermission('users:write'), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    username: z.string().min(3).max(64),
    displayName: z.string().min(1).max(128),
    role: z.enum(['superadmin', 'customs_broker', 'publisher', 'auditor']),
    password: z.string().min(8).max(200),
    enabled: z.boolean().optional(),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'INVALID_BODY' })
    return
  }

  const { username, displayName, role, password, enabled } = parsed.data
  const id = randomUUID()
  const password_hash = await bcrypt.hash(password, 12)

  try {
    await db.query(
      'INSERT INTO users (id, username, display_name, password_hash, role, enabled) VALUES (:id, :username, :display_name, :password_hash, :role, :enabled)',
      {
        id,
        username,
        display_name: displayName,
        password_hash,
        role,
        enabled: enabled === false ? 0 : 1,
      },
    )
  } catch {
    res.status(409).json({ success: false, error: 'USERNAME_EXISTS' })
    return
  }

  await writeAudit({
    req,
    user: req.user,
    eventType: 'users.create',
    target: { type: 'user', id },
    summary: `Created user ${username} as ${role}`,
  })

  res.status(201).json({
    success: true,
    data: { id, username, displayName, role, enabled: enabled === false ? false : true },
  })
}))

router.patch('/:id', requirePermission('users:write'), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    displayName: z.string().min(1).max(128).optional(),
    role: z.enum(['superadmin', 'customs_broker', 'publisher', 'auditor']).optional(),
    enabled: z.boolean().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'INVALID_BODY' })
    return
  }
  const id = req.params.id

  const updates: string[] = []
  const params: Record<string, string | number> = { id }
  if (typeof parsed.data.displayName === 'string') {
    updates.push('display_name = :display_name')
    params.display_name = parsed.data.displayName
  }
  if (typeof parsed.data.role === 'string') {
    updates.push('role = :role')
    params.role = parsed.data.role
  }
  if (typeof parsed.data.enabled === 'boolean') {
    updates.push('enabled = :enabled')
    params.enabled = parsed.data.enabled ? 1 : 0
  }

  if (updates.length === 0) {
    res.status(400).json({ success: false, error: 'NO_UPDATES' })
    return
  }

  const [result] = await db.query<ResultSetHeader>(
    `UPDATE users SET ${updates.join(', ')} WHERE id = :id`,
    params,
  )

  if (!result || result.affectedRows === 0) {
    res.status(404).json({ success: false, error: 'NOT_FOUND' })
    return
  }

  await writeAudit({
    req,
    user: req.user,
    eventType: 'users.update',
    target: { type: 'user', id },
    summary: 'Updated user fields',
  })

  res.status(200).json({ success: true })
}))

router.post(
  '/:id/reset-password',
  requirePermission('users:write'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const schema = z.object({ password: z.string().min(8).max(200) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'INVALID_BODY' })
      return
    }

    const id = req.params.id
    if (!req.user) {
      res.status(401).json({ success: false, error: 'UNAUTHENTICATED' })
      return
    }
    if (req.user.role !== 'superadmin') {
      res.status(403).json({ success: false, error: 'FORBIDDEN' })
      return
    }
    if (req.user.id === id) {
      res.status(403).json({ success: false, error: 'CANNOT_CHANGE_OWN_PASSWORD' })
      return
    }

    const password_hash = await bcrypt.hash(parsed.data.password, 12)
    const [result] = await db.query<ResultSetHeader>(
      'UPDATE users SET password_hash = :password_hash WHERE id = :id',
      { id, password_hash },
    )
    if (!result || result.affectedRows === 0) {
      res.status(404).json({ success: false, error: 'NOT_FOUND' })
      return
    }

    await writeAudit({
      req,
      user: req.user,
      eventType: 'users.reset_password',
      target: { type: 'user', id },
      summary: 'Reset password',
    })

    res.status(200).json({ success: true })
  }),
)

export default router
