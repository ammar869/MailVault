import { Inbox } from '@mailvault/shared'
import { logger } from '@mailvault/shared'
import { Email } from '@mailvault/shared'
import { Attachment } from '@mailvault/shared'
import { OtpRecord } from '@mailvault/shared'
import { Alias } from '@mailvault/shared'
import { publishRealtimeEvent } from '../utils/socket.js'
import { connectDB } from '../config/database.js'

async function deleteAttachmentObject(bucket: string, key: string) {
  const { deleteFromS3 } = await import('../utils/s3.js')
  await deleteFromS3(bucket, key)
}

export async function processExpireInboxJob(): Promise<void> {
  await connectDB()
  const now = new Date()
  const expiredInboxes = await Inbox.find({
    expiresAt: { $lte: now },
    isActive: true,
  }).exec()

  for (const inbox of expiredInboxes) {
    inbox.isActive = false
    await inbox.save()
    await Email.updateMany({ inboxId: inbox._id, status: { $ne: 'deleted' } }, { $set: { status: 'deleted' } }).exec()
    await Alias.updateMany({ targetInboxId: inbox._id, isActive: true }, { $set: { isActive: false } }).exec()
    await publishRealtimeEvent(inbox._id.toString(), 'inbox.expired', { inboxId: inbox._id.toString() })
    logger.info({ inboxId: inbox._id }, 'Inbox expired and deactivated')
  }

  logger.info({ count: expiredInboxes.length }, 'Inbox expiration check completed')
}

export async function processPurgeEmailJob(): Promise<void> {
  await connectDB()
  const purgeBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days

  const deletedEmails = await Email.find({
    status: 'deleted',
    updatedAt: { $lte: purgeBefore },
  }).exec()

  for (const email of deletedEmails) {
    const attachments = await Attachment.find({ emailId: email._id }).exec()
    for (const attachment of attachments) {
      try {
        await deleteAttachmentObject(attachment.s3Bucket, attachment.s3Key)
      } catch (error) {
        logger.error({ err: error, attachmentId: attachment._id }, 'Failed to delete attachment from S3')
        continue
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
  await connectDB()
  const attachments = await Attachment.find().exec()
  let cleaned = 0

  for (const attachment of attachments) {
    const email = await Email.findById(attachment.emailId).exec()
    if (!email) {
      try {
        await deleteAttachmentObject(attachment.s3Bucket, attachment.s3Key)
      } catch (error) {
        logger.error({ err: error, attachmentId: attachment._id }, 'Failed to delete orphan attachment from S3')
        continue
      }
      await Attachment.findByIdAndDelete(attachment._id).exec()
      cleaned++
      logger.info({ attachmentId: attachment._id }, 'Orphan attachment cleaned up')
    }
  }

  logger.info({ count: cleaned }, 'Orphan attachment cleanup completed')
}

export async function processCleanupJob(name: string): Promise<void> {
  logger.info({ name }, `Processing cleanup job: ${name}`)
  switch (name) {
    case 'expireInbox': return processExpireInboxJob()
    case 'purgeEmail': return processPurgeEmailJob()
    case 'cleanupAttachments': return processOrphanAttachmentCleanupJob()
    default: logger.warn({ jobName: name }, 'Unknown cleanup job')
  }
}

logger.info('Cleanup job processors loaded')
