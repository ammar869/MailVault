import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { webhookDeliveryService } from '@mailvault/shared'
import { logger } from '../utils/logger.js'
import { Worker } from 'bullmq'
import { env } from '../config/env.js'

const ioredis = await import('ioredis')
const RedisClient = ioredis.default || ioredis
const connection = new (RedisClient as any)(env.REDIS_URL, { maxRetriesPerRequest: null })

new Worker('webhook-delivery', async (job) => {
  logger.info({ jobId: job.id }, 'Processing webhook delivery job')

  const deliveries = await webhookDeliveryService.getPendingDeliveries(50)

  for (const delivery of deliveries) {
    await webhookDeliveryService.processDelivery(delivery._id.toString())
  }

  logger.info({ processed: deliveries.length }, 'Webhook delivery batch completed')
}, { connection, concurrency: 2 })

logger.info('Webhook delivery worker registered')