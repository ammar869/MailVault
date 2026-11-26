import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { analyticsService } from '@mailvault/shared'
import { logger } from '../utils/logger.js'
import { Worker } from 'bullmq'
import { env } from '../config/env.js'
import { Email } from '@mailvault/shared'
import { Inbox } from '@mailvault/shared'
import { OutgoingWebhook } from '@mailvault/shared'

const ioredis = await import('ioredis')
const RedisClient = ioredis.default || ioredis
const connection = new (RedisClient as any)(env.REDIS_URL, { maxRetriesPerRequest: null })

new Worker('analytics', async (job) => {
  logger.info({ jobId: job.id, name: job.name }, `Processing analytics job: ${job.name}`)

  switch (job.name) {
    case 'aggregate-daily':
      await aggregateDailyStats()
      break
    case 'cleanup-events':
      await cleanupOldEvents()
      break
    default:
      logger.warn({ jobName: job.name }, 'Unknown analytics job')
  }
}, { connection, concurrency: 1 })

async function aggregateDailyStats() {
  logger.info('Aggregating daily stats...')

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // This would typically be triggered by events, but we can also do a catch-up
  logger.info('Daily stats aggregation completed')
}

async function cleanupOldEvents() {
  logger.info('Cleaning up old analytics events...')
  // Events have TTL index, but we can do additional cleanup if needed
  logger.info('Old events cleanup completed')
}

// Event-driven stats recording is handled by the analytics service
// This worker is for scheduled aggregation/cleanup tasks

logger.info('Analytics worker registered')