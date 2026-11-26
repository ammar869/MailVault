import { Response, NextFunction } from 'express'
import { outgoingWebhookService } from '@mailvault/shared'
import { AppError } from '../../middleware/errorHandler.js'
import { AuthRequest } from '../../middleware/authenticate.js'

export const outgoingWebhookController = {
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const webhook = await outgoingWebhookService.create(req.user!.userId, req.body)
      res.status(201).json({ data: webhook, meta: { message: 'Webhook created' } })
    } catch (error) {
      next(error)
    }
  },

  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as any
      const { webhooks, total } = await outgoingWebhookService.list(req.user!.userId, query)
      res.json({ data: webhooks, meta: { total, limit: query.limit, offset: query.offset } })
    } catch (error) {
      next(error)
    }
  },

  get: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const webhook = await outgoingWebhookService.getById(req.user!.userId, req.params.id)
      res.json({ data: webhook })
    } catch (error: any) {
      if (error instanceof AppError && error.code === 'WEBHOOK_NOT_FOUND') {
        return next(new AppError(404, 'WEBHOOK_NOT_FOUND', 'Webhook not found'))
      }
      next(error)
    }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const webhook = await outgoingWebhookService.update(req.user!.userId, req.params.id, req.body)
      res.json({ data: webhook, meta: { message: 'Webhook updated' } })
    } catch (error: any) {
      if (error instanceof AppError && error.code === 'WEBHOOK_NOT_FOUND') {
        return next(new AppError(404, 'WEBHOOK_NOT_FOUND', 'Webhook not found'))
      }
      next(error)
    }
  },

  delete: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await outgoingWebhookService.delete(req.user!.userId, req.params.id)
      res.json({ data: null, meta: { message: 'Webhook deleted' } })
    } catch (error: any) {
      if (error instanceof AppError && error.code === 'WEBHOOK_NOT_FOUND') {
        return next(new AppError(404, 'WEBHOOK_NOT_FOUND', 'Webhook not found'))
      }
      next(error)
    }
  },
}