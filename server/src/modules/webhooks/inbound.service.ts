import crypto from 'crypto'
import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { env } from '../../config/env.js'
import { inboxService } from '../inboxes/inbox.service.js'
import { logger } from '../../utils/logger.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { SesWebhookInput, MailgunWebhookInput } from './inbound.schema.js'

const RedisClient = (await import('ioredis')).default
const connection = new RedisClient(env.REDIS_URL, { maxRetriesPerRequest: null })
const emailParsingQueue = new Queue('email-parsing', { connection })

function verifySesSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

function verifyMailgunSignature(timestamp: string, token: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(timestamp + token).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

function extractRecipientFromSes(record: any): string | null {
  const receipt = record.ses?.receipt
  if (receipt?.recipients?.[0]) return receipt.recipients[0].toLowerCase()
  const mail = record.ses?.mail
  if (mail?.destination?.[0]) return mail.destination[0].toLowerCase()
  return null
}

function extractRecipientFromMailgun(body: any): string | null {
  return body['X-Envelope-To']?.toLowerCase() || body['To']?.toLowerCase() || null
}

function extractRawMessageFromSes(record: any): string | null {
  const action = record.ses?.receipt?.action
  if (action?.type === 'S3' && action.bucketName && action.objectKey) {
    return `s3://${action.bucketName}/${action.objectKey}`
  }
  return null
}

function extractRawMessageFromMailgun(body: any): string | null {
  return body['body-plain'] || body['body-html'] || null
}

export const inboundWebhookService = {
  async handleSes(req: any, _res: any) {
    const signature = req.headers['x-amz-sns-message-type'] ? req.headers['x-amz-sns-signature'] : null
    const payload = JSON.stringify(req.body)

    if (env.WEBHOOK_SECRET_SES && signature) {
      if (!verifySesSignature(payload, signature, env.WEBHOOK_SECRET_SES)) {
        logger.warn('Invalid SES webhook signature')
        throw new AppError(401, 'INVALID_SIGNATURE', 'Invalid webhook signature')
      }
    }

    const records = req.body.Records || []
    const results = []

    for (const record of records) {
      const recipient = extractRecipientFromSes(record)
      if (!recipient) {
        logger.warn('No recipient found in SES record')
        continue
      }

      const inbox = await inboxService.findByAddress(recipient)
      if (!inbox) {
        logger.warn({ recipient }, 'Inbox not found for recipient')
        continue
      }

      const canAccept = await inboxService.checkCapacity(inbox._id.toString())
      if (!canAccept) {
        logger.warn({ inboxId: inbox._id }, 'Inbox at capacity')
        continue
      }

      const rawMessageRef = extractRawMessageFromSes(record)
      const messageId = record.ses?.mail?.messageId || crypto.randomUUID()

      await emailParsingQueue.add('parseEmail', {
        inboxId: inbox._id.toString(),
        messageId,
        rawMessageRef,
        provider: 'ses',
        recipient,
        envelope: {
          from: record.ses?.mail?.source,
          to: recipient,
        },
      })

      await inboxService.incrementMessageCount(inbox._id.toString())
      results.push({ inboxId: inbox._id, messageId })
    }

    logger.info({ count: results.length }, 'SES webhook processed')
    return results
  },

  async handleMailgun(req: any, _res: any) {
    const signature = req.headers['x-mailgun-signature']
    const timestamp = req.headers['x-mailgun-timestamp']
    const token = req.headers['x-mailgun-token']

    if (env.WEBHOOK_SECRET_MAILGUN && signature && timestamp && token) {
      if (!verifyMailgunSignature(timestamp, token, signature, env.WEBHOOK_SECRET_MAILGUN)) {
        logger.warn('Invalid Mailgun webhook signature')
        throw new AppError(401, 'INVALID_SIGNATURE', 'Invalid webhook signature')
      }
    }

    const recipient = extractRecipientFromMailgun(req.body)
    if (!recipient) {
      logger.warn('No recipient found in Mailgun webhook')
      return []
    }

    const inbox = await inboxService.findByAddress(recipient)
    if (!inbox) {
      logger.warn({ recipient }, 'Inbox not found for recipient')
      return []
    }

    const canAccept = await inboxService.checkCapacity(inbox._id.toString())
    if (!canAccept) {
      logger.warn({ inboxId: inbox._id }, 'Inbox at capacity')
      return []
    }

    const rawMessageRef = extractRawMessageFromMailgun(req.body)
    const messageId = req.body['Message-Id'] || crypto.randomUUID()

    await emailParsingQueue.add('parseEmail', {
      inboxId: inbox._id.toString(),
      messageId,
      rawMessageRef,
      provider: 'mailgun',
      recipient,
      envelope: {
        from: req.body['X-Envelope-From'],
        to: recipient,
      },
    })

    await inboxService.incrementMessageCount(inbox._id.toString())

    logger.info({ inboxId: inbox._id, messageId }, 'Mailgun webhook processed')
    return [{ inboxId: inbox._id, messageId }]
  },
}