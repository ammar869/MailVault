import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import { connectDB } from './config/database.js'
import { healthRouter } from './routes/health.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { inboxRouter } from './modules/inboxes/inbox.routes.js'
import { inboundWebhookRouter } from './modules/webhooks/inbound.routes.js'
import { emailRouter } from './modules/emails/email.routes.js'
import { aliasRouter } from './modules/aliases/alias.routes.js'
import { aiRouter } from './modules/ai/ai.routes.js'
import { errorHandler } from './middleware/errorHandler.js'
import { logger } from './utils/logger.js'
import { initSocket } from './utils/socket.js'

const app = express()
const httpServer = createServer(app)

app.use(helmet())
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }))
app.use(compression())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use('/api/v1/health', healthRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/inboxes', inboxRouter)
app.use('/webhooks/inbound', inboundWebhookRouter)
app.use('/api/v1/emails', emailRouter)
app.use('/api/v1/aliases', aliasRouter)
app.use('/api/v1/ai', aiRouter)

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } })
})

app.use(errorHandler)

const startServer = async () => {
  try {
    await connectDB()
    await initSocket(httpServer)
    httpServer.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`)
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server')
    process.exit(1)
  }
}

startServer()

export default app