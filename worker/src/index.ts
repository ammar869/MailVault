import 'dotenv/config'
import { Worker } from 'bullmq'
import { logger } from '@mailvault/shared'
import { processParseEmailJob } from './jobs/parseEmail.js'
import { processAIJob } from './jobs/ai.js'
import { processCleanupJob } from './jobs/cleanup.js'
import { processWebhookDeliveryJob } from './jobs/webhookDelivery.js'
import { processAnalyticsJob } from './jobs/analytics.js'
import { aiQueue, analyticsQueue, cleanupQueue, emailParsingQueue, redisConnection, webhookDeliveryQueue } from './queues.js'

logger.info('Worker queues initialized')

async function scheduleMaintenanceJobs() {
  await Promise.all([
    cleanupQueue.add('expireInbox', {}, { jobId: 'repeat-expire-inboxes', repeat: { every: 60_000 } }),
    cleanupQueue.add('purgeEmail', {}, { jobId: 'repeat-purge-emails', repeat: { every: 6 * 60 * 60_000 } }),
    cleanupQueue.add('cleanupAttachments', {}, { jobId: 'repeat-cleanup-attachments', repeat: { every: 24 * 60 * 60_000 } }),
    webhookDeliveryQueue.add('deliver-pending', {}, { jobId: 'repeat-webhook-delivery', repeat: { every: 5_000 } }),
    analyticsQueue.add('aggregate-daily', {}, { jobId: 'repeat-analytics-daily', repeat: { every: 24 * 60 * 60_000 } }),
    analyticsQueue.add('cleanup-events', {}, { jobId: 'repeat-analytics-cleanup', repeat: { every: 7 * 24 * 60 * 60_000 } }),
  ])
}

scheduleMaintenanceJobs().catch((error) => logger.error({ err: error }, 'Could not schedule maintenance jobs'))

const workers: Worker[] = []

function createWorker(name: string, processor: (job: any) => Promise<void>, concurrency = 5) {
  const worker = new Worker(name, processor, { connection: redisConnection, concurrency })
  worker.on('completed', (job) => logger.debug({ jobId: job.id }, `Job completed: ${name}`))
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, `Job failed: ${name}`))
  workers.push(worker)
  return worker
}

createWorker('email-parsing', async (job) => {
  logger.info({ jobId: job.id }, 'Processing email parsing job')
  await processParseEmailJob(job.data)
}, 5)

createWorker('ai', async (job) => processAIJob(job.data), 3)

createWorker('webhook-delivery', async () => processWebhookDeliveryJob(), 1)

createWorker('analytics', async (job) => processAnalyticsJob(job.name), 1)

createWorker('cleanup', async (job) => processCleanupJob(job.name), 5)

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing workers...')
  await Promise.all(workers.map(w => w.close()))
  await Promise.all([emailParsingQueue.close(), aiQueue.close(), cleanupQueue.close(), webhookDeliveryQueue.close(), analyticsQueue.close()])
  await redisConnection.quit()
  process.exit(0)
})

logger.info('Worker started and listening for jobs')
