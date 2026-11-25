import { Inbox } from '@mailvault/shared'
import { logger } from '@mailvault/shared'
import { cleanupQueue } from '../index.js'
import { deleteFromS3 } from '@mailvault/shared'
import { Email } from '@mailvault/shared'
import { Attachment } from '@mailvault/shared'
import { OtpRecord } from '@mailvault/shared'
import { Worker } from 'bullmq'
import { env } from '@mailvault/shared'

const ioredis = await import('ioredis')
const RedisClient = ioredis.default || ioredis
const connection = new (RedisClient as any)(env.REDIS_URL, { maxRetriesPerRequest: null })

export async function processExpireInboxJob(): Promise<void> {
  const now = new Date()
  const expiredInboxes = await Inbox.find({
    expiresAt: { $lte: now },
    isActive: true,
  }).exec()

  for (const inbox of expiredInboxes) {
    inbox.isActive = false
    await inbox.save()
    logger.info({ inboxId: inbox._id }, 'Inbox expired and deactivated')
  }

  logger.info({ count: expiredInboxes.length }, 'Inbox expiration check completed')
}

export async function processPurgeEmailJob(): Promise<void> {
  const purgeBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days

  const deletedEmails = await Email.find({
    status: 'deleted',
    updatedAt: { $lte: purgeBefore },
  }).exec()

  for (const email of deletedEmails) {
    const attachments = await Attachment.find({ emailId: email._id }).exec()
    for (const attachment of attachments) {
      try {
        await deleteFromS3(attachment.s3Bucket, attachment.s3Key)
      } catch (error) {
        logger.error({ err: error, attachmentId: attachment._id }, 'Failed to delete attachment from S3')
      }
      await Attachment.findByIdAndDelete(attachment._id).exec()
    }

    await OtpRecord.deleteMany({ emailId: email._id }).exec()
    await Email.findByIdAndDelete(email._id).exec()

    logger.info({ emailId: email._id }, 'Email permanently purged')
  }

  logger.info({ count: deletedEmails.length }, 'Email purge completed')
}

export async function processOrphanAttachmentCleanupJob(): Promise<void> {
  const attachments = await Attachment.find().exec()
  let cleaned = 0

  for (const attachment of attachments) {
    const email = await Email.findById(attachment.emailId).exec()
    if (!email) {
      try {
        await deleteFromS3(attachment.s3Bucket, attachment.s3Key)
      } catch (error) {
        logger.error({ err: error, attachmentId: attachment._id }, 'Failed to delete orphan attachment from S3')
      }
      await Attachment.findByIdAndDelete(attachment._id).exec()
      cleaned++
      logger.info({ attachmentId: attachment._id }, 'Orphan attachment cleaned up')
    }
  }

  logger.info({ count: cleaned }, 'Orphan attachment cleanup completed')
}

new Worker('cleanup', async (job) => {
  logger.info({ jobId: job.id, name: job.name }, `Processing cleanup job: ${job.name}`)
  
  switch (job.name) {
    case 'expireInbox':
      await processExpireInboxJob()
      break
    case 'purgeEmail':
      await processPurgeEmailJob()
      break
    case 'cleanupAttachments':
      await processOrphanAttachmentCleanupJob()
      break
    default:
      logger.warn({ jobName: job.name }, 'Unknown cleanup job')
  }
}, { connection, concurrency: 5 })

logger.info('Cleanup workers registered')