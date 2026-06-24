import { Router, type Request, type Response } from 'express'
import type { RowDataPacket } from 'mysql2/promise'
import { db } from '../db/pool.js'
import { requireAuth, requirePermission } from '../auth/middleware.js'
import { asyncHandler } from '../http/asyncHandler.js'

type AuditRow = RowDataPacket & {
  id: string
  event_type: string
  actor_user_id: string | null
  actor_username: string | null
  target_type: string | null
  target_id: string | null
  summary: string | null
  ip: string | null
  user_agent: string | null
  created_at: string
}

const router = Router()

router.use(requireAuth)
router.use(requirePermission('audit:read'))

router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const [rows] = await db.query<AuditRow[]>(
    'SELECT id, event_type, actor_user_id, actor_username, target_type, target_id, summary, ip, user_agent, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 500',
  )
  res.status(200).json({
    success: true,
    data: rows.map((r) => ({
      id: String(r.id),
      eventType: String(r.event_type),
      actorUserId: r.actor_user_id ? String(r.actor_user_id) : null,
      actorUsername: r.actor_username ? String(r.actor_username) : null,
      targetType: r.target_type ? String(r.target_type) : null,
      targetId: r.target_id ? String(r.target_id) : null,
      summary: r.summary ? String(r.summary) : null,
      ip: r.ip ? String(r.ip) : null,
      userAgent: r.user_agent ? String(r.user_agent) : null,
      createdAt: r.created_at,
    })),
  })
}))

export default router
