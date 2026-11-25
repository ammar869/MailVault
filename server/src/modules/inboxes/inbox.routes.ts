import { Router } from 'express'
import { inboxController } from './inbox.controller.js'
import { createInboxSchema, updateInboxSchema, inboxIdSchema, listInboxesSchema } from './inbox.schema.js'
import { validate } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/authenticate.js'

export const inboxRouter = Router()

inboxRouter.use(authenticate)

inboxRouter.post('/', validate(createInboxSchema), inboxController.create)
inboxRouter.get('/', validate(listInboxesSchema), inboxController.list)
inboxRouter.get('/:id', validate(inboxIdSchema), inboxController.getById)
inboxRouter.patch('/:id', validate(updateInboxSchema), inboxController.update)
inboxRouter.delete('/:id', validate(inboxIdSchema), inboxController.delete)