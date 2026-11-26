import { Router } from 'express'
import { outgoingWebhookController } from './outgoingWebhook.controller.js'
import { createWebhookSchema, updateWebhookSchema, webhookIdSchema, listWebhooksSchema } from '@mailvault/shared'
import { validate } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/authenticate.js'

export const outgoingWebhookRouter = Router()

outgoingWebhookRouter.use(authenticate)

outgoingWebhookRouter.post('/', validate(createWebhookSchema), outgoingWebhookController.create)
outgoingWebhookRouter.get('/', validate(listWebhooksSchema), outgoingWebhookController.list)
outgoingWebhookRouter.get('/:id', validate(webhookIdSchema), outgoingWebhookController.get)
outgoingWebhookRouter.patch('/:id', validate(updateWebhookSchema), outgoingWebhookController.update)
outgoingWebhookRouter.delete('/:id', validate(webhookIdSchema), outgoingWebhookController.delete)