import { Email } from '@mailvault/shared'
import { Attachment } from '@mailvault/shared'
import { OtpRecord } from '@mailvault/shared'
import { inboxService } from '../inboxes/inbox.service.js'
import { logger } from '../../utils/logger.js'

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

    await inboxService.incrementMessageCount(data.inboxId)

    logger.info({ emailId: email._id, inboxId: data.inboxId, messageId: data.messageId }, 'Email created')
    return email
  },
}