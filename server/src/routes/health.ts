import { Router, Request, Response } from 'express'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

export const healthRouter = Router()

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() })
})

let redisClient: any

healthRouter.get('/ready', async (_req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) throw new Error('MongoDB is not connected')
    if (!redisClient) {
      const ioredis = await import('ioredis')
      const RedisClient = ioredis.default || ioredis
      redisClient = new (RedisClient as any)(env.REDIS_URL, { maxRetriesPerRequest: 1 })
    }
    await redisClient.ping()
    res.json({ status: 'ready' })
  } catch (error) {
    logger.warn({ err: error }, 'Readiness check failed')
    res.status(503).json({ status: 'not_ready' })
  }
})

healthRouter.get('/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive' })
})
