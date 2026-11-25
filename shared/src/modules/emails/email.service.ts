import { Email } from './email.model.js'
import { Attachment } from './attachment.model.js'
import { OtpRecord } from './otp.model.js'
import { logger } from '../../utils/logger.js'
import { AppError } from '../../utils/appError.js'

export const emailService = {
  async list(userId: string, query: any) {
    const filter: any = { userId }
    if (query.inboxId) filter.inboxId = query.inboxId
    if (query.status) filter.status = query.status
    if (query.hasAttachment !== undefined) filter.hasAttachment = query.hasAttachment
    if (query.from) filter.from = { $regex: query.from, $options: 'i' }
    if (query.to) filter.to = { $regex: query.to, $options: 'i' }
    if (query.subject) filter.subject = { $regex: query.subject, $options: 'i' }
    if (query.search) {
      filter.$or = [
        { subject: { $regex: query.search, $options: 'i' } },
        { from: { $regex: query.search, $options: 'i' } },
        { to: { $regex: query.search, $options: 'i' } },
        { bodyText: { $regex: query.search, $options: 'i' } },
      ]
    }
    if (query.dateFrom || query.dateTo) {
      filter.receivedAt = {}
      if (query.dateFrom) filter.receivedAt.$gte = new Date(query.dateFrom)
      if (query.dateTo) filter.receivedAt.$lte = new Date(query.dateTo)
    }

    const [emails, total] = await Promise.all([
      Email.find(filter)
        .sort({ receivedAt: -1 })
        .skip(query.offset)
        .limit(query.limit)
        .lean()
        .exec(),
      Email.countDocuments(filter),
    ])

    return { emails, total }
  },

  async getById(userId: string, emailId: string) {
    const email = await Email.findOne({ _id: emailId, userId }).lean().exec()
    if (!email) {
      throw new AppError(404, 'EMAIL_NOT_FOUND', 'Email not found')
    }

    const attachments = await Attachment.find({ emailId }).lean().exec()
    const otpRecords = await OtpRecord.find({ emailId }).lean().exec()

    return { email, attachments, otpRecords }
  },

  async update(userId: string, emailId: string, input: any) {
    const email = await Email.findOneAndUpdate(
      { _id: emailId, userId },
      { $set: input },
      { new: true, runValidators: true }
    ).exec()

    if (!email) {
      throw new AppError(404, 'EMAIL_NOT_FOUND', 'Email not found')
    }

    logger.info({ emailId, userId }, 'Email updated')
    return email
  },

  async delete(userId: string, emailId: string) {
    const email = await Email.findOneAndUpdate(
      { _id: emailId, userId },
      { $set: { status: 'deleted' } },
      { new: true }
    ).exec()

    if (!email) {
      throw new AppError(404, 'EMAIL_NOT_FOUND', 'Email not found')
    }

    logger.info({ emailId, userId }, 'Email soft-deleted')
    return email
  },

  async getAttachments(userId: string, emailId: string) {
    const email = await Email.findOne({ _id: emailId, userId }).exec()
    if (!email) {
      throw new AppError(404, 'EMAIL_NOT_FOUND', 'Email not found')
    }

    return Attachment.find({ emailId }).exec()
  },

  async getOtpRecords(userId: string, emailId: string) {
    const email = await Email.findOne({ _id: emailId, userId }).exec()
    if (!email) {
      throw new AppError(404, 'EMAIL_NOT_FOUND', 'Email not found')
    }

    return OtpRecord.find({ emailId }).exec()
  },
}