import { Router } from 'express'
import { emailController } from './email.controller.js'
import { listEmailsSchema, emailIdSchema, updateEmailSchema, attachmentIdSchema } from './email.schema.js'
import { validate } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/authenticate.js'

export const emailRouter = Router()

emailRouter.use(authenticate)

emailRouter.get('/', validate(listEmailsSchema), emailController.list)
emailRouter.get('/:id', validate(emailIdSchema), emailController.getById)
emailRouter.patch('/:id', validate(updateEmailSchema), emailController.update)
emailRouter.delete('/:id', validate(emailIdSchema), emailController.delete)
emailRouter.get('/:emailId/attachments/:attachmentId/url', validate(attachmentIdSchema), emailController.getAttachmentUrl)