import { Response, NextFunction } from 'express'
import { apiKeyService } from '@mailvault/shared'
import { AppError } from '../../middleware/errorHandler.js'
import { AuthRequest } from '../../middleware/authenticate.js'

export const apiKeyController = {
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { apiKey, key } = await apiKeyService.create(req.user!.userId, req.body)
      res.status(201).json({
        data: {
          ...apiKey.toObject(),
          key, // Only returned once on creation
        },
        meta: { message: 'API key created. Save the key now - it will not be shown again.' },
      })
    } catch (error) {
      next(error)
    }
  },

  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as any
      const { keys, total } = await apiKeyService.list(req.user!.userId, query)
      res.json({ data: keys, meta: { total, limit: query.limit, offset: query.offset } })
    } catch (error) {
      next(error)
    }
  },

  get: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const apiKey = await apiKeyService.getById(req.user!.userId, req.params.id)
      res.json({ data: apiKey })
    } catch (error: any) {
      if (error instanceof AppError && error.code === 'API_KEY_NOT_FOUND') {
        return next(new AppError(404, 'API_KEY_NOT_FOUND', 'API key not found'))
      }
      next(error)
    }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const apiKey = await apiKeyService.update(req.user!.userId, req.params.id, req.body)
      res.json({ data: apiKey, meta: { message: 'API key updated' } })
    } catch (error: any) {
      if (error instanceof AppError && error.code === 'API_KEY_NOT_FOUND') {
        return next(new AppError(404, 'API_KEY_NOT_FOUND', 'API key not found'))
      }
      next(error)
    }
  },

  delete: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await apiKeyService.delete(req.user!.userId, req.params.id)
      res.json({ data: null, meta: { message: 'API key deleted' } })
    } catch (error: any) {
      if (error instanceof AppError && error.code === 'API_KEY_NOT_FOUND') {
        return next(new AppError(404, 'API_KEY_NOT_FOUND', 'API key not found'))
      }
      next(error)
    }
  },
}