import { Response, NextFunction } from 'express'
import { inboundWebhookService } from './inbound.service.js'
import { AppError } from '../../middleware/errorHandler.js'

export const inboundWebhookController = {
  ses: async (req: any, res: Response, next: NextFunction) => {
    try {
      await inboundWebhookService.handleSes(req, res)
      res.status(200).json({ received: true })
    } catch (error) {
      if (error instanceof AppError) {
        return next(error)
      }
      next(new AppError(400, 'WEBHOOK_ERROR', 'Failed to process webhook'))
    }
  },

  mailgun: async (req: any, res: Response, next: NextFunction) => {
    try {
      await inboundWebhookService.handleMailgun(req, res)
      res.status(200).json({ received: true })
    } catch (error) {
      if (error instanceof AppError) {
        return next(error)
      }
      next(new AppError(400, 'WEBHOOK_ERROR', 'Failed to process webhook'))
    }
  },
}