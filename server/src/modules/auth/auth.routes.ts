import { Router } from 'express'
import { authController } from './auth.controller.js'
import { registerSchema, loginSchema, refreshSchema } from './auth.schema.js'
import { validate } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/authenticate.js'

export const authRouter = Router()

authRouter.post('/register', validate(registerSchema), authController.register)
authRouter.post('/login', validate(loginSchema), authController.login)
authRouter.post('/logout', authController.logout)
authRouter.post('/refresh', validate(refreshSchema), authController.refresh)
authRouter.get('/me', authenticate, authController.me)