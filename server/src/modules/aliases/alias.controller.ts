import { Response, NextFunction } from 'express'
import { aliasService } from '@mailvault/shared'
import { AppError } from '../../middleware/errorHandler.js'
import { AuthRequest } from '../../middleware/authenticate.js'

export const aliasController = {
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const alias = await aliasService.create(req.user!.userId, req.body)
      res.status(201).json({
        data: alias,
        meta: { message: 'Alias created successfully' },
      })
    } catch (error: any) {
      if (error.message === 'TARGET_INBOX_NOT_FOUND') {
        return next(new AppError(404, 'TARGET_INBOX_NOT_FOUND', 'Target inbox not found'))
      }
      if (error.message === 'FORBIDDEN') {
        return next(new AppError(403, 'FORBIDDEN', 'Target inbox does not belong to user'))
      }
      if (error.message === 'ADDRESS_EXISTS') {
        return next(new AppError(409, 'ADDRESS_EXISTS', 'Alias address already exists'))
      }
      next(error)
    }
  },

  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as any
      const { aliases, total } = await aliasService.list(req.user!.userId, query)
      res.json({
        data: aliases,
        meta: { total, limit: query.limit, offset: query.offset },
      })
    } catch (error) {
      next(error)
    }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const alias = await aliasService.getById(req.user!.userId, req.params.id)
      res.json({ data: alias })
    } catch (error: any) {
      if (error.message === 'ALIAS_NOT_FOUND') {
        return next(new AppError(404, 'ALIAS_NOT_FOUND', 'Alias not found'))
      }
      next(error)
    }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const alias = await aliasService.update(req.user!.userId, req.params.id, req.body)
      res.json({ data: alias, meta: { message: 'Alias updated successfully' } })
    } catch (error: any) {
      if (error.message === 'ALIAS_NOT_FOUND') {
        return next(new AppError(404, 'ALIAS_NOT_FOUND', 'Alias not found'))
      }
      if (error.message === 'TARGET_INBOX_NOT_FOUND') {
        return next(new AppError(404, 'TARGET_INBOX_NOT_FOUND', 'Target inbox not found'))
      }
      if (error.message === 'FORBIDDEN') {
        return next(new AppError(403, 'FORBIDDEN', 'Target inbox does not belong to user'))
      }
      next(error)
    }
  },

  delete: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await aliasService.delete(req.user!.userId, req.params.id)
      res.json({ data: null, meta: { message: 'Alias deleted successfully' } })
    } catch (error: any) {
      if (error.message === 'ALIAS_NOT_FOUND') {
        return next(new AppError(404, 'ALIAS_NOT_FOUND', 'Alias not found'))
      }
      next(error)
    }
  },
}
