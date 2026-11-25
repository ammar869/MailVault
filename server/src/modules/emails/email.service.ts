import { Email } from './email.model.js'
import { Attachment } from './attachment.model.js'
import { OtpRecord } from './otp.model.js'
import { inboxService } from '../inboxes/inbox.service.js'
import { AppError } from '../../middleware/errorHandler.js'
import { logger } from '../../utils/logger.js'
import { emitEmailNew, emitOtpExtracted, emitEmailRead, emitEmailDeleted } from '../../utils/socket.js'
import type { ListEmailsQuery, UpdateEmailInput } from './email.schema.js'

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

    emitEmailNew(data.inboxId, {
      id: email._id,
      messageId: email.messageId,
      from: email.from,
      subject: email.subject,
      receivedAt: email.receivedAt,
      otpCodes: email.otpCodes,
    })

    for (const otp of data.otpCodes) {
      emitOtpExtracted(data.inboxId, otp)
    }

    return email
  },

  async list(userId: string, query: ListEmailsQuery) {
    const inboxFilter: Record<string, any> = {}
    if (query.inboxId) {
      const inbox = await inboxService.getById(userId, query.inboxId)
      inboxFilter._id = inbox._id
    } else {
      const inboxes = await inboxService.list(userId, { limit: 1000, offset: 0 })
      inboxFilter._id = { $in: inboxes.inboxes.map(i => i._id) }
    }

    const filter: Record<string, any> = { inboxId: { $in: Array.isArray(inboxFilter._id) ? inboxFilter._id : [inboxFilter._id] } }

    if (query.status) filter.status = query.status
    if (query.from) filter['from.address'] = { $regex: query.from, $options: 'i' }
    if (query.subject) filter.subject = { $regex: query.subject, $options: 'i' }
    if (query.startDate || query.endDate) {
      filter.receivedAt = {}
      if (query.startDate) filter.receivedAt.$gte = new Date(query.startDate)
      if (query.endDate) filter.receivedAt.$lte = new Date(query.endDate)
    }

    const sortField = query.sort === 'subject' ? 'subject' : query.sort === 'from' ? 'from.address' : 'receivedAt'
    const sortOrder = query.order === 'asc' ? 1 : -1

    const [emails, total] = await Promise.all([
      Email.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(query.offset)
        .limit(query.limit)
        .populate('attachments')
        .lean()
        .exec(),
      Email.countDocuments(filter),
    ])

    return { emails, total }
  },

  async getById(userId: string, emailId: string) {
    const email = await Email.findById(emailId)
      .populate('attachments')
      .lean()
      .exec()

    if (!email) {
      throw new AppError(404, 'EMAIL_NOT_FOUND', 'Email not found')
    }

    const inbox = await inboxService.getById(userId, email.inboxId.toString())
    if (!inbox) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied')
    }

    return email
  },

  async update(userId: string, emailId: string, input: UpdateEmailInput) {
    const email = await Email.findById(emailId).exec()
    if (!email) {
      throw new AppError(404, 'EMAIL_NOT_FOUND', 'Email not found')
    }

    const inbox = await inboxService.getById(userId, email.inboxId.toString())
    if (!inbox) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied')
    }

    const updateData: Record<string, any> = {}
    if (input.status) {
      updateData.status = input.status
      if (input.status === 'read' && email.status !== 'read') {
        updateData.readAt = new Date()
      }
    }

    const updated = await Email.findByIdAndUpdate(emailId, { $set: updateData }, { new: true })
      .populate('attachments')
      .lean()
      .exec()

    if (input.status === 'read' && email.status !== 'read') {
      emitEmailRead(email.inboxId.toString(), emailId)
    }

    return updated
  },

  async delete(userId: string, emailId: string) {
    const email = await Email.findById(emailId).exec()
    if (!email) {
      throw new AppError(404, 'EMAIL_NOT_FOUND', 'Email not found')
    }

    const inbox = await inboxService.getById(userId, email.inboxId.toString())
    if (!inbox) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied')
    }

    await Email.findByIdAndUpdate(emailId, { $set: { status: 'deleted' } }).exec()
    await Attachment.deleteMany({ emailId }).exec()
    await OtpRecord.deleteMany({ emailId }).exec()

    logger.info({ emailId, userId }, 'Email soft-deleted')
    emitEmailDeleted(email.inboxId.toString(), emailId)
    return true
  },

  async getAttachment(emailId: string, attachmentId: string) {
    const attachment = await Attachment.findOne({ _id: attachmentId, emailId }).lean().exec()
    if (!attachment) {
      throw new AppError(404, 'ATTACHMENT_NOT_FOUND', 'Attachment not found')
    }
    return attachment
  },
}