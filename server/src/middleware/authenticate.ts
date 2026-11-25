import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, TokenPayload } from '../modules/auth/auth.service.js'
import { AppError } from './errorHandler.js'

export interface AuthRequest extends Request {
  user?: TokenPayload
}

export const authenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'No token provided')
    }

    const token = authHeader.slice(7)
    const payload = await verifyAccessToken(token)

    if (payload.type !== 'access') {
      throw new AppError(401, 'INVALID_TOKEN_TYPE', 'Invalid token type')
    }

    req.user = payload
    next()
  } catch (error) {
    if (error instanceof AppError) {
      next(error)
    } else {
      next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token'))
    }
  }
}

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return next()
    }

    const token = authHeader.slice(7)
    const payload = await verifyAccessToken(token)

    if (payload.type === 'access') {
      req.user = payload
    }
    next()
  } catch {
    next()
  }
}