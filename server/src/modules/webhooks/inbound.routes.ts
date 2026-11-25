import { Router } from 'express'
import { inboundWebhookController } from './inbound.controller.js'
import { sesWebhookSchema, mailgunWebhookSchema } from './inbound.schema.js'
import { validate } from '../../middleware/validate.js'

export const inboundWebhookRouter = Router()

inboundWebhookRouter.post('/ses', validate(sesWebhookSchema), inboundWebhookController.ses)
inboundWebhookRouter.post('/mailgun', validate(mailgunWebhookSchema), inboundWebhookController.mailgun)