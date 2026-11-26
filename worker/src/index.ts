import 'dotenv/config'
import { Queue, Worker } from 'bullmq'
import { env, logger } from '@mailvault/shared'
import { processParseEmailJob } from './jobs/parseEmail.js'
import './jobs/ai.js'
import './jobs/cleanup.js'
import './jobs/webhookDelivery.js'
import './jobs/analytics.js'

const ioredis = await import('ioredis')
const RedisClient = ioredis.default || ioredis
const connection = new (RedisClient as any)(env.REDIS_URL, { maxRetriesPerRequest: null })

export const emailParsingQueue = new Queue('email-parsing', { connection })
export const aiQueue = new Queue('ai', { connection })
export const cleanupQueue = new Queue('cleanup', { connection })
export const webhookDeliveryQueue = new Queue('webhook-delivery', { connection })
export const analyticsQueue = new Queue('analytics', { connection })

logger.info('Worker queues initialized')

const workers: Worker[] = []

function createWorker(name: string, queue: Queue, processor: (job: any) => Promise<void>) {
  const worker = new Worker(name, processor, { connection, concurrency: 5 })
  worker.on('completed', (job) => logger.debug({ jobId: job.id }, `Job completed: ${name}`))
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, `Job failed: ${name}`))
  workers.push(worker)
  return worker
}

createWorker('email-parsing', emailParsingQueue, async (job) => {
  logger.info({ jobId: job.id, data: job.data }, 'Processing email parsing job')
  await processParseEmailJob(job.data)
})

createWorker('ai', aiQueue, async (job) => {
  logger.info({ jobId: job.id, data: job.data }, 'Processing AI job')
})

createWorker('webhook-delivery', webhookDeliveryQueue, async (job) => {
  logger.info({ jobId: job.id, data: job.data }, 'Processing webhook delivery job')
})

createWorker('analytics', analyticsQueue, async (job) => {
  logger.info({ jobId: job.id, data: job.data }, 'Processing analytics job')
})

createWorker('cleanup', cleanupQueue, async (job) => {
  logger.info({ jobId: job.id, name: job.name }, `Processing cleanup job: ${job.name}`)
})

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing workers...')
  await Promise.all(workers.map(w => w.close()))
  await connection.quit()
  process.exit(0)
})

logger.info('Worker started and listening for jobs')