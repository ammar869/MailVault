import { NextFunction, Response } from 'express'
import { apiKeyService } from '@mailvault/shared'
import { env } from '../config/env.js'
import { AppError } from './errorHandler.js'
import { AuthRequest, authenticate } from './authenticate.js'

let redis: any
async function getRedis() {
  if (redis) return redis
  const ioredis = await import('ioredis')
  const RedisClient = ioredis.default || ioredis
  redis = new (RedisClient as any)(env.REDIS_URL, { maxRetriesPerRequest: 1 })
  return redis
}

export async function authenticateEmailAccess(req: AuthRequest, res: Response, next: NextFunction) {
  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined
  const key = req.headers['x-api-key'] || (bearer?.startsWith('mvk_') ? bearer : undefined)
  if (!key || typeof key !== 'string') return authenticate(req, res, next)

  try {
    const result = await apiKeyService.validate(key)
    if (!result.valid || !result.apiKey) throw new AppError(401, 'INVALID_API_KEY', 'API key is invalid or expired')
    const minute = Math.floor(Date.now() / 60_000)
    const client = await getRedis()
    const count = await client.incr(`api-key-rate:${result.apiKey.id}:${minute}`)
    if (count === 1) await client.expire(`api-key-rate:${result.apiKey.id}:${minute}`, 120)
    if (count > result.apiKey.rateLimit) throw new AppError(429, 'RATE_LIMITED', 'API key rate limit exceeded')

    req.user = { userId: result.apiKey.userId.toString(), email: '', role: 'user', type: 'access' }
    ;(req as AuthRequest & { apiKey?: typeof result.apiKey }).apiKey = result.apiKey
    next()
  } catch (error) {
    next(error)
  }
}

export function requireScope(scope: string) {
  return (req: AuthRequest & { apiKey?: { scopes: string[] } }, _res: Response, next: NextFunction) => {
    if (!req.apiKey || req.apiKey.scopes.includes('*') || req.apiKey.scopes.includes(scope)) return next()
    next(new AppError(403, 'INSUFFICIENT_SCOPE', `API key requires ${scope} scope`))
  }
}
