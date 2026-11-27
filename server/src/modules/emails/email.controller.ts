import { Response, NextFunction } from 'express'
import { emailService } from './email.service.js'
import { AppError } from '../../middleware/errorHandler.js'
import { AuthRequest } from '../../middleware/authenticate.js'
import type { ListEmailsQuery, UpdateEmailInput } from './email.schema.js'
import { OtpRecord } from './otp.model.js'

export const emailController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ListEmailsQuery
      const { emails, total } = await emailService.list(req.user!.userId, query)
      res.json({
        data: emails,
        meta: { total, limit: query.limit, offset: query.offset },
      })
    } catch (error) {
      next(error)
    }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const email = await emailService.getById(req.user!.userId, req.params.id)
      const otpRecords = await OtpRecord.find({ emailId: req.params.id }).sort({ createdAt: -1 }).lean().exec()
      res.json({
        data: {
          email,
          attachments: email.attachments,
          otpRecords: otpRecords.map(otp => ({ ...otp, id: otp._id.toString() })),
        },
      })
    } catch (error) {
      next(error)
    }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = req.body as UpdateEmailInput
      const email = await emailService.update(req.user!.userId, req.params.id, input)
      res.json({ data: email, meta: { message: 'Email updated successfully' } })
    } catch (error) {
      next(error)
    }
  },

  delete: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await emailService.delete(req.user!.userId, req.params.id)
      res.json({ data: null, meta: { message: 'Email deleted successfully' } })
    } catch (error) {
      next(error)
    }
  },

  getAttachmentUrl: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { emailId, attachmentId } = req.params
      const attachment = await emailService.getAttachment(emailId, attachmentId)

      const email = await emailService.getById(req.user!.userId, emailId)
      if (!email) {
        throw new AppError(404, 'EMAIL_NOT_FOUND', 'Email not found')
      }

      const { getPresignedUrl } = await import('../../utils/s3.js')
      const url = await getPresignedUrl(attachment.s3Bucket, attachment.s3Key, 300)
      res.json({ data: { url, filename: attachment.filename, mimeType: attachment.mimeType, size: attachment.size } })
    } catch (error) {
      next(error)
    }
  },
}
