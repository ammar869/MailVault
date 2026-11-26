import { Router } from 'express'
import { apiKeyController } from './apiKey.controller.js'
import { createApiKeySchema, updateApiKeySchema, apiKeyIdSchema, listApiKeysSchema } from '@mailvault/shared'
import { validate } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/authenticate.js'

export const apiKeyRouter = Router()

apiKeyRouter.use(authenticate)

apiKeyRouter.post('/', validate(createApiKeySchema), apiKeyController.create)
apiKeyRouter.get('/', validate(listApiKeysSchema), apiKeyController.list)
apiKeyRouter.get('/:id', validate(apiKeyIdSchema), apiKeyController.get)
apiKeyRouter.patch('/:id', validate(updateApiKeySchema), apiKeyController.update)
apiKeyRouter.delete('/:id', validate(apiKeyIdSchema), apiKeyController.delete)