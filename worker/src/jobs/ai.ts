import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { aiService } from '@mailvault/shared'
import { logger } from '../utils/logger.js'
import { AIResult } from '@mailvault/shared'
import { publishRealtimeEvent } from '../utils/socket.js'

interface AIJobData {
  emailId: string
  inboxId: string
  userId: string
  from: string
  to: string[]
  subject: string
  bodyText: string
  bodyHtml: string | null
  hasAttachment: boolean
  otpCodes: string[]
}

export async function processAIJob(jobData: AIJobData): Promise<void> {
  await connectDB()

  logger.info({ emailId: jobData.emailId }, 'Processing AI job')

  await aiService.processEmail({
    _id: jobData.emailId,
    inboxId: jobData.inboxId,
    userId: jobData.userId,
    from: jobData.from,
    to: jobData.to,
    subject: jobData.subject,
    bodyText: jobData.bodyText,
    bodyHtml: jobData.bodyHtml,
    hasAttachment: jobData.hasAttachment,
    otpCodes: jobData.otpCodes,
  })

  const result = await AIResult.findOne({ emailId: jobData.emailId }).lean().exec()
  if (result) {
    await publishRealtimeEvent(jobData.inboxId, 'ai.completed', {
      emailId: jobData.emailId,
      status: result.status,
    })
  }

  logger.info({ emailId: jobData.emailId }, 'AI job completed')
}

logger.info('AI job processor loaded')
