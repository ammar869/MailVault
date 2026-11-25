import { Response, NextFunction } from 'express'
import { inboxService } from './inbox.service.js'
import { AppError } from '../../middleware/errorHandler.js'
import { AuthRequest } from '../../middleware/authenticate.js'
import type { ListInboxesQuery } from './inbox.schema.js'

export const inboxController = {
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const inbox = await inboxService.create(req.user!.userId, req.body)
      res.status(201).json({
        data: inbox,
        meta: { message: 'Inbox created successfully' },
      })
    } catch (error) {
      next(error)
    }
  },

  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ListInboxesQuery
      const { inboxes, total } = await inboxService.list(req.user!.userId, query)
      res.json({
        data: inboxes,
        meta: { total, limit: query.limit, offset: query.offset },
      })
    } catch (error) {
      next(error)
    }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const inbox = await inboxService.getById(req.user!.userId, req.params.id)
      res.json({ data: inbox })
    } catch (error) {
      next(error)
    }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const inbox = await inboxService.update(req.user!.userId, req.params.id, req.body)
      res.json({ data: inbox, meta: { message: 'Inbox updated successfully' } })
    } catch (error) {
      next(error)
    }
  },

  delete: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await inboxService.delete(req.user!.userId, req.params.id)
      res.json({ data: null, meta: { message: 'Inbox deleted successfully' } })
    } catch (error) {
      next(error)
    }
  },
}