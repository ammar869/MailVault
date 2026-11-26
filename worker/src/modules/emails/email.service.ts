import { Email } from '@mailvault/shared'
import { Attachment } from '@mailvault/shared'
import { OtpRecord } from '@mailvault/shared'
import { Inbox } from '@mailvault/shared'
import { OutgoingWebhook } from '@mailvault/shared'
import { analyticsService } from '@mailvault/shared'
import { webhookDeliveryService } from '@mailvault/shared'
import { inboxService } from '../inboxes/inbox.service.js'
import { logger } from '../../utils/logger.js'
import { publishRealtimeEvent } from '../../utils/socket.js'

export const emailService = {
  async create(data: {
    inboxId: string
    messageId: string
    from: { name: string; address: string }
    to: { name: string; address: string }[]
    cc: { name: string; address: string }[]
    bcc: { name: string; address: string }[]
    subject: string
    textBody: string
    htmlBody: string
    receivedAt: Date
    size: number
    attachments: { filename: string; mimeType: string; size: number; s3Key: string; s3Bucket: string }[]
    otpCodes: string[]
    countInbox?: boolean
  }) {
    const email = await Email.create({
      inboxId: data.inboxId,
      messageId: data.messageId,
      from: data.from,
      to: data.to,
      cc: data.cc,
      bcc: data.bcc,
      subject: data.subject,
      textBody: data.textBody,
      htmlBody: data.htmlBody,
      receivedAt: data.receivedAt,
      size: data.size,
      attachments: [],
      otpCodes: data.otpCodes,
    })

    if (data.attachments.length > 0) {
      const attachmentDocs = await Attachment.insertMany(
        data.attachments.map(a => ({
          emailId: email._id,
          filename: a.filename,
          mimeType: a.mimeType,
          size: a.size,
          s3Key: a.s3Key,
          s3Bucket: a.s3Bucket,
          virusScanStatus: 'pending' as const,
        }))
      )

      email.attachments = attachmentDocs.map(d => d._id)
      await email.save()
    }

    if (data.otpCodes.length > 0) {
      await OtpRecord.insertMany(
        data.otpCodes.map(code => ({
          emailId: email._id,
          code,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }))
      )
    }

    await publishRealtimeEvent(data.inboxId, 'email.new', {
      id: email._id,
      messageId: email.messageId,
      from: email.from,
      subject: email.subject,
      receivedAt: email.receivedAt,
      otpCodes: email.otpCodes,
    })
    for (const code of data.otpCodes) {
      await publishRealtimeEvent(data.inboxId, 'otp.extracted', { otp: code })
    }

    if (data.countInbox !== false) await inboxService.incrementMessageCount(data.inboxId)

    logger.info({ emailId: email._id, inboxId: data.inboxId, messageId: data.messageId }, 'Email created')

    // Trigger webhook deliveries
    const webhooks = await OutgoingWebhook.find({ events: 'email.new', isActive: true }).exec()
    for (const webhook of webhooks) {
      const payload = {
        event: 'email.new',
        timestamp: new Date().toISOString(),
        email: {
          id: email._id,
          messageId: email.messageId,
          from: email.from,
          to: email.to,
          subject: email.subject,
          receivedAt: email.receivedAt,
          hasAttachment: email.attachments.length > 0,
          otpCodes: email.otpCodes,
        },
      }
      const idempotencyKey = webhookDeliveryService.generateIdempotencyKey('email.new', email._id.toString())
      await webhookDeliveryService.scheduleDelivery(webhook, 'email.new', payload, idempotencyKey)
    }

    // Record analytics events
    await analyticsService.recordEvent(data.inboxId, data.inboxId, 'email.received', {
      emailId: email._id,
      messageId: data.messageId,
      hasAttachment: data.attachments.length > 0,
      otpCount: data.otpCodes.length,
    })

    // Increment daily stats
    await analyticsService.incrementDailyStat(data.inboxId, data.inboxId, 'emailsReceived')
    if (data.attachments.length > 0) {
      await analyticsService.incrementDailyStat(data.inboxId, data.inboxId, 'attachmentsReceived', data.attachments.length)
      await analyticsService.incrementDailyStat(data.inboxId, data.inboxId, 'totalAttachmentSize', data.attachments.reduce((sum, a) => sum + a.size, 0))
    }
    if (data.otpCodes.length > 0) {
      await analyticsService.incrementDailyStat(data.inboxId, data.inboxId, 'otpCodesExtracted', data.otpCodes.length)
    }

    return email
  },
}
