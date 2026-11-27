import { Request, Response, NextFunction } from 'express'
import { register, login, refreshTokens, getMe, updateProfile, changePassword, revokeAllSessions } from './auth.service.js'
import { AppError } from '../../middleware/errorHandler.js'
import { AuthRequest } from '../../middleware/authenticate.js'
import { getIO } from '../../utils/socket.js'

function disconnectUserSockets(userId: string) {
  getIO()?.in(`user:${userId}`).disconnectSockets(true)
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
}

export const authController = {
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, tokens } = await register(req.body)
      res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS)
      res.status(201).json({
        data: { user, accessToken: tokens.accessToken },
        meta: { message: 'Registration successful' },
      })
    } catch (error) {
      next(error)
    }
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, tokens } = await login(req.body)
      res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS)
      res.json({
        data: { user, accessToken: tokens.accessToken },
        meta: { message: 'Login successful' },
      })
    } catch (error) {
      next(error)
    }
  },

  logout: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.clearCookie('refreshToken', COOKIE_OPTIONS)
      res.json({ data: null, meta: { message: 'Logged out successfully' } })
    } catch (error) {
      next(error)
    }
  },

  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken
      if (!refreshToken) {
        throw new AppError(401, 'REFRESH_TOKEN_MISSING', 'Refresh token is required')
      }

      const tokens = await refreshTokens({ refreshToken })
      res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS)
      res.json({
        data: { accessToken: tokens.accessToken },
        meta: { message: 'Tokens refreshed' },
      })
    } catch (error) {
      next(error)
    }
  },

  me: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await getMe(req.user!.userId)
      res.json({ data: { user } })
    } catch (error) {
      next(error)
    }
  },

  updateProfile: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await updateProfile(req.user!.userId, req.body)
      res.json({ data: { user }, meta: { message: 'Profile updated successfully' } })
    } catch (error) {
      next(error)
    }
  },

  changePassword: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await changePassword(req.user!.userId, req.body)
      disconnectUserSockets(req.user!.userId)
      res.clearCookie('refreshToken', COOKIE_OPTIONS)
      res.json({ data: null, meta: { message: 'Password changed successfully' } })
    } catch (error) {
      next(error)
    }
  },

  revokeSessions: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await revokeAllSessions(req.user!.userId)
      disconnectUserSockets(req.user!.userId)
      res.clearCookie('refreshToken', COOKIE_OPTIONS)
      res.json({ data: null, meta: { message: 'All sessions have been revoked' } })
    } catch (error) {
      next(error)
    }
  },
}
