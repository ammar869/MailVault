import 'dotenv/config'
import { AnalyticsDaily, AnalyticsEvent } from '@mailvault/shared'
import { connectDB } from '../config/database.js'
import { logger } from '../utils/logger.js'

const zeroStats = () => ({
  emailsReceived: 0, emailsRead: 0, emailsDeleted: 0, otpCodesExtracted: 0,
  attachmentsReceived: 0, totalAttachmentSize: 0, aiProcessed: 0,
  aiTokensUsed: 0, webhooksDelivered: 0, webhooksFailed: 0,
})

export async function processAnalyticsJob(name: string): Promise<void> {
  await connectDB()
  logger.info({ name }, `Processing analytics job: ${name}`)
  switch (name) {
    case 'aggregate-daily': await aggregateDailyStats(); break
    case 'cleanup-events': await cleanupOldEvents(); break
    default: logger.warn({ jobName: name }, 'Unknown analytics job')
  }
}

async function aggregateDailyStats() {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(start.getDate() - 1)
  const events = await AnalyticsEvent.find({ createdAt: { $gte: start, $lt: end } }).lean().exec()
  const buckets = new Map<string, { userId: string; inboxId: string | null; stats: ReturnType<typeof zeroStats> }>()

  for (const event of events) {
    const userId = event.userId.toString()
    const inboxId = event.inboxId?.toString() || null
    const key = `${userId}:${inboxId || 'all'}`
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = { userId, inboxId, stats: zeroStats() }
      buckets.set(key, bucket)
    }
    switch (event.eventType) {
      case 'email.received':
        bucket.stats.emailsReceived++
        bucket.stats.otpCodesExtracted += Number(event.metadata?.otpCount || 0)
        bucket.stats.attachmentsReceived += Number(event.metadata?.attachmentCount || 0)
        bucket.stats.totalAttachmentSize += Number(event.metadata?.attachmentSize || 0)
        break
      case 'email.read': bucket.stats.emailsRead++; break
      case 'email.deleted': bucket.stats.emailsDeleted++; break
      case 'ai.completed':
        bucket.stats.aiProcessed++
        bucket.stats.aiTokensUsed += Number(event.metadata?.tokensUsed || 0)
        break
      case 'webhook.delivered': bucket.stats.webhooksDelivered++; break
      case 'webhook.failed': bucket.stats.webhooksFailed++; break
    }
  }

  await Promise.all([...buckets.values()].map(bucket => AnalyticsDaily.findOneAndUpdate(
    { userId: bucket.userId, inboxId: bucket.inboxId, date: start },
    { $set: bucket.stats },
    { upsert: true },
  ).exec()))
  logger.info({ date: start, events: events.length, buckets: buckets.size }, 'Daily analytics aggregation completed')
}

async function cleanupOldEvents() {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const result = await AnalyticsEvent.deleteMany({ createdAt: { $lt: cutoff } }).exec()
  logger.info({ deleted: result.deletedCount }, 'Old analytics events cleaned up')
}

logger.info('Analytics job processors loaded')
