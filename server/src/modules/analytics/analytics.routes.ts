import { Router } from 'express'
import { analyticsController } from './analytics.controller.js'
import { analyticsQuerySchema, analyticsEventsQuerySchema } from '@mailvault/shared'
import { validate } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/authenticate.js'

export const analyticsRouter = Router()

analyticsRouter.use(authenticate)

analyticsRouter.get('/daily', validate(analyticsQuerySchema), analyticsController.getDailyStats)
analyticsRouter.get('/aggregated', validate(analyticsQuerySchema), analyticsController.getAggregatedStats)
analyticsRouter.get('/events', validate(analyticsEventsQuerySchema), analyticsController.getEvents)
analyticsRouter.get('/summary', analyticsController.getSummary)