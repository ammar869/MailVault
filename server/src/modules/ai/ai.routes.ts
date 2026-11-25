import { Router } from 'express'
import { aiController } from './ai.controller.js'
import { processEmailAISchema, aiToggleSchema } from '@mailvault/shared'
import { validate } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/authenticate.js'

export const aiRouter = Router()

aiRouter.use(authenticate)

aiRouter.get('/result/:emailId', aiController.getResult)
aiRouter.get('/inbox/:inboxId', aiController.getResultsByInbox)
aiRouter.get('/user', aiController.getResultsByUser)
aiRouter.get('/usage', aiController.getTokenUsage)
aiRouter.post('/reprocess', validate(processEmailAISchema), aiController.reprocess)
aiRouter.patch('/inbox/:inboxId/toggle', validate(aiToggleSchema), aiController.toggleAI)