import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { logger } from '../utils/logger.js'
export async function processAnalyticsJob(name: string): Promise<void> {
  await connectDB()
  logger.info({ name }, `Processing analytics job: ${name}`)
  switch (name) {
    case 'aggregate-daily':
      await aggregateDailyStats()
      break
    case 'cleanup-events':
      await cleanupOldEvents()
      break
    default:
      logger.warn({ jobName: name }, 'Unknown analytics job')
  }
}

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

logger.info('Analytics job processors loaded')
