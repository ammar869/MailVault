import { Response, NextFunction } from 'express'
import { aiService } from '@mailvault/shared'
import { AppError } from '../../middleware/errorHandler.js'
import { AuthRequest } from '../../middleware/authenticate.js'
import { Queue } from 'bullmq'
import { env } from '../../config/env.js'

const ioredis = await import('ioredis')
const RedisClient = ioredis.default || ioredis
const connection = new (RedisClient as any)(env.REDIS_URL, { maxRetriesPerRequest: null })
const aiQueue = new Queue('ai', { connection })

export const aiController = {
  getResult: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { emailId } = req.params
      const result = await aiService.getResult(emailId)

      if (!result) {
        return next(new AppError(404, 'AI_RESULT_NOT_FOUND', 'AI analysis not found for this email'))
      }

      if (result.userId.toString() !== req.user!.userId) {
        return next(new AppError(403, 'FORBIDDEN', 'Not authorized to view this AI result'))
      }

      res.json({ data: result })
    } catch (error) {
      next(error)
    }
  },

  getResultsByInbox: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { inboxId } = req.params
      const limit = parseInt(req.query.limit as string) || 50
      const offset = parseInt(req.query.offset as string) || 0

      // Verify inbox ownership
      const { Inbox } = await import('@mailvault/shared')
      const inbox = await Inbox.findById(inboxId).exec()
      if (!inbox || inbox.userId.toString() !== req.user!.userId) {
        return next(new AppError(404, 'INBOX_NOT_FOUND', 'Inbox not found'))
      }

      const { results, total } = await aiService.getResultsByInbox(inboxId, limit, offset)
      res.json({ data: results, meta: { total, limit, offset } })
    } catch (error) {
      next(error)
    }
  },

  getResultsByUser: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50
      const offset = parseInt(req.query.offset as string) || 0

      const { results, total } = await aiService.getResultsByUser(req.user!.userId, limit, offset)
      res.json({ data: results, meta: { total, limit, offset } })
    } catch (error) {
      next(error)
    }
  },

  getTokenUsage: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const days = parseInt(req.query.days as string) || 30
      const usage = await aiService.getTokenUsage(req.user!.userId, days)
      res.json({ data: { tokensUsed: usage, periodDays: days } })
    } catch (error) {
      next(error)
    }
  },

  reprocess: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { emailId } = req.body
      const { Email } = await import('@mailvault/shared')

      const email = await Email.findById(emailId).exec()
      if (!email) {
        return next(new AppError(404, 'EMAIL_NOT_FOUND', 'Email not found'))
      }

      if (email.userId.toString() !== req.user!.userId) {
        return next(new AppError(403, 'FORBIDDEN', 'Not authorized to reprocess this email'))
      }

      // Re-queue AI job
      await aiQueue.add('process-ai', {
        emailId: email._id,
        inboxId: email.inboxId,
        from: email.from.address,
        to: email.to.map((t: { address: string }) => t.address),
        subject: email.subject,
        bodyText: email.textBody,
        bodyHtml: email.htmlBody,
        hasAttachment: email.attachments.length > 0,
        otpCodes: email.otpCodes,
        userId: email.userId,
      })

      res.json({ data: null, meta: { message: 'AI reprocessing queued' } })
    } catch (error) {
      next(error)
    }
  },

  toggleAI: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { inboxId } = req.params
      const { enabled } = req.body

      const { Inbox } = await import('@mailvault/shared')
      const inbox = await Inbox.findById(inboxId).exec()

      if (!inbox) {
        return next(new AppError(404, 'INBOX_NOT_FOUND', 'Inbox not found'))
      }

      if (inbox.userId.toString() !== req.user!.userId) {
        return next(new AppError(403, 'FORBIDDEN', 'Not authorized to modify this inbox'))
      }

      inbox.aiEnabled = enabled
      await inbox.save()

      res.json({ data: inbox, meta: { message: `AI ${enabled ? 'enabled' : 'disabled'} for inbox` } })
    } catch (error) {
      next(error)
    }
  },
}