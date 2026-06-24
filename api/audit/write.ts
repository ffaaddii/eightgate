import type { Request } from 'express-serve-static-core'
import { randomUUID } from 'crypto'
import { db } from '../db/pool.js'
import type { SessionUser } from '../auth/types.js'

export type AuditTarget = {
  type?: string
  id?: string
}

export async function writeAudit(args: {
  req: Request
  user?: SessionUser | null
  eventType: string
  target?: AuditTarget
  summary?: string | null
}): Promise<void> {
  const ip = args.req.ip
  const userAgent = args.req.get('user-agent')
  const actorUserId = args.user?.id ?? null
  const actorUsername = args.user?.username ?? null

  await db.query(
    'INSERT INTO audit_logs (id, event_type, actor_user_id, actor_username, target_type, target_id, summary, ip, user_agent) VALUES (:id, :event_type, :actor_user_id, :actor_username, :target_type, :target_id, :summary, :ip, :user_agent)',
    {
      id: randomUUID(),
      event_type: args.eventType,
      actor_user_id: actorUserId,
      actor_username: actorUsername,
      target_type: args.target?.type ?? null,
      target_id: args.target?.id ?? null,
      summary: args.summary ?? null,
      ip: ip ?? null,
      user_agent: userAgent ?? null,
    },
  )
}

