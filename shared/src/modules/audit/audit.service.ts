import { AuditLog } from './audit.model.js'
import { logger } from '../../utils/logger.js'

export interface AuditLogInput {
  userId: string | null
  action: string
  resourceType: string
  resourceId: string | null
  metadata?: Record<string, any>
  ip?: string
  userAgent?: string
}

export const auditService = {
  async log(input: AuditLogInput) {
    try {
      await AuditLog.create({
        userId: input.userId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        metadata: input.metadata || {},
        ip: input.ip || '',
        userAgent: input.userAgent || '',
      })
    } catch (error) {
      logger.error({ err: error, input }, 'Failed to write audit log')
    }
  },

  async getLogs(userId: string, limit: number = 100, offset: number = 0) {
    const [logs, total] = await Promise.all([
      AuditLog.find({ userId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      AuditLog.countDocuments({ userId }),
    ])

    return { logs, total }
  },
}