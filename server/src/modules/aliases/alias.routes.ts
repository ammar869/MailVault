import { Router } from 'express'
import { aliasController } from './alias.controller.js'
import { createAliasSchema, updateAliasSchema, aliasIdSchema, listAliasesSchema } from '@mailvault/shared'
import { validate } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/authenticate.js'

export const aliasRouter = Router()

aliasRouter.use(authenticate)

aliasRouter.post('/', validate(createAliasSchema), aliasController.create)
aliasRouter.get('/', validate(listAliasesSchema), aliasController.list)
aliasRouter.get('/:id', validate(aliasIdSchema), aliasController.getById)
aliasRouter.patch('/:id', validate(updateAliasSchema), aliasController.update)
aliasRouter.delete('/:id', validate(aliasIdSchema), aliasController.delete)