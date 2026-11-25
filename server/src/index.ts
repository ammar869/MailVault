import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { env } from './config/env.js'
import { healthRouter } from './routes/health.js'
import { errorHandler } from './middleware/errorHandler.js'
import { logger } from './utils/logger.js'

const app = express()

app.use(helmet())
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }))
app.use(compression())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/v1/health', healthRouter)

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } })
})

app.use(errorHandler)

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`)
})

export default app