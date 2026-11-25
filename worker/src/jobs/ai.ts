import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { aiService } from '@mailvault/shared'
import { logger } from '../utils/logger.js'
import { Worker } from 'bullmq'
import { env } from '../config/env.js'

const ioredis = await import('ioredis')
const RedisClient = ioredis.default || ioredis
const connection = new (RedisClient as any)(env.REDIS_URL, { maxRetriesPerRequest: null })

interface AIJobData {
  emailId: string
  inboxId: string
  userId: string
  from: string
  to: string[]
  subject: string
  bodyText: string
  bodyHtml: string | null
  hasAttachment: boolean
  otpCodes: string[]
}

export async function processAIJob(jobData: AIJobData): Promise<void> {
  await connectDB()

  logger.info({ emailId: jobData.emailId }, 'Processing AI job')

  await aiService.processEmail({
    _id: jobData.emailId,
    inboxId: jobData.inboxId,
    userId: jobData.userId,
    from: jobData.from,
    to: jobData.to,
    subject: jobData.subject,
    bodyText: jobData.bodyText,
    bodyHtml: jobData.bodyHtml,
    hasAttachment: jobData.hasAttachment,
    otpCodes: jobData.otpCodes,
  })

  logger.info({ emailId: jobData.emailId }, 'AI job completed')
}

new Worker('ai', async (job) => {
  logger.info({ jobId: job.id, emailId: job.data.emailId }, 'Processing AI job')
  await processAIJob(job.data)
}, { connection, concurrency: 3 })

logger.info('AI worker registered')