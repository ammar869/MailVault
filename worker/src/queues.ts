import { Queue } from 'bullmq'
import { env } from './config/env.js'

const ioredis = await import('ioredis')
const RedisClient = ioredis.default || ioredis
export const redisConnection = new (RedisClient as any)(env.REDIS_URL, { maxRetriesPerRequest: null })

export const emailParsingQueue = new Queue('email-parsing', { connection: redisConnection })
export const aiQueue = new Queue('ai', { connection: redisConnection })
export const cleanupQueue = new Queue('cleanup', { connection: redisConnection })
export const webhookDeliveryQueue = new Queue('webhook-delivery', { connection: redisConnection })
export const analyticsQueue = new Queue('analytics', { connection: redisConnection })
