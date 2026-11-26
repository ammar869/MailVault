import { Response, NextFunction } from 'express'
import { analyticsService } from '@mailvault/shared'
import { AppError } from '../../middleware/errorHandler.js'
import { AuthRequest } from '../../middleware/authenticate.js'

export const analyticsController = {
  getDailyStats: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as any
      const { stats, total } = await analyticsService.getDailyStats(req.user!.userId, query)
      res.json({ data: stats, meta: { total, limit: query.limit, offset: query.offset } })
    } catch (error) {
      next(error)
    }
  },

  getAggregatedStats: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as any
      const { stats } = await analyticsService.getAggregatedStats(req.user!.userId, query)
      res.json({ data: stats })
    } catch (error) {
      next(error)
    }
  },

  getEvents: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as any
      const { events, total } = await analyticsService.getEvents(req.user!.userId, query)
      res.json({ data: events, meta: { total, limit: query.limit, offset: query.offset } })
    } catch (error) {
      next(error)
    }
  },

  getSummary: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const days = parseInt(req.query.days as string) || 30
      const summary = await analyticsService.getSummary(req.user!.userId, days)
      res.json({ data: summary })
    } catch (error) {
      next(error)
    }
  },
}