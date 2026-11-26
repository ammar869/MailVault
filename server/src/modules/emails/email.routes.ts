import { Router } from 'express'
import { emailController } from './email.controller.js'
import { listEmailsSchema, emailIdSchema, updateEmailSchema, attachmentIdSchema } from './email.schema.js'
import { validate } from '../../middleware/validate.js'
import { authenticateEmailAccess, requireScope } from '../../middleware/apiKeyAuth.js'

export const emailRouter = Router()

emailRouter.use(authenticateEmailAccess)

emailRouter.get('/', requireScope('emails:read'), validate(listEmailsSchema), emailController.list)
emailRouter.get('/:id', requireScope('emails:read'), validate(emailIdSchema), emailController.getById)
emailRouter.patch('/:id', requireScope('emails:write'), validate(updateEmailSchema), emailController.update)
emailRouter.delete('/:id', requireScope('emails:write'), validate(emailIdSchema), emailController.delete)
emailRouter.get('/:emailId/attachments/:attachmentId/url', requireScope('emails:read'), validate(attachmentIdSchema), emailController.getAttachmentUrl)
