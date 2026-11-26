import crypto from 'crypto'
import { Queue } from 'bullmq'
import { env } from '../../config/env.js'
import { inboxService } from '../inboxes/inbox.service.js'
import { RawInboundMessage } from '@mailvault/shared'
import { Alias } from '@mailvault/shared'
import { logger } from '../../utils/logger.js'
import { AppError } from '../../middleware/errorHandler.js'

let emailParsingQueue: Queue

async function initQueue() {
  const ioredis = await import('ioredis')
  const RedisClient = ioredis.default || ioredis
  const connection = new (RedisClient as any)(env.REDIS_URL, { maxRetriesPerRequest: null })
  emailParsingQueue = new Queue('email-parsing', { connection })
}

initQueue()

const SNS_HOST_PATTERN = /^sns\.[a-z0-9-]+\.amazonaws\.com(?:\.cn)?$/

function snsStringToSign(message: Record<string, any>): string | null {
  const fields = message.Type === 'Notification'
    ? ['Message', 'MessageId', ...(message.Subject ? ['Subject'] : []), 'Timestamp', 'TopicArn', 'Type']
    : message.Type === 'SubscriptionConfirmation' || message.Type === 'UnsubscribeConfirmation'
      ? ['Message', 'MessageId', ...(message.Subject ? ['Subject'] : []), 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type']
      : []
  if (!fields.length || fields.some((field) => typeof message[field] !== 'string')) return null
  return fields.map((field) => `${field}\n${message[field]}\n`).join('')
}

async function verifySnsMessage(message: Record<string, any>): Promise<boolean> {
  if (!message.Signature || !message.SigningCertURL || !['1', '2'].includes(message.SignatureVersion)) return false
  let certUrl: URL
  try { certUrl = new URL(message.SigningCertURL) } catch { return false }
  if (certUrl.protocol !== 'https:' || !SNS_HOST_PATTERN.test(certUrl.hostname) || certUrl.port || certUrl.username || certUrl.password) return false
  const stringToSign = snsStringToSign(message)
  if (!stringToSign) return false

  const response = await fetch(certUrl, { signal: AbortSignal.timeout(5000), redirect: 'error' })
  if (!response.ok) return false
  const certificate = new crypto.X509Certificate(await response.text())
  const now = Date.now()
  if (new Date(certificate.validFrom).getTime() > now || new Date(certificate.validTo).getTime() < now ||
    !certificate.subject.includes('Amazon Simple Notification Service')) return false
  const verifier = crypto.createVerify(message.SignatureVersion === '2' ? 'RSA-SHA256' : 'RSA-SHA1')
  verifier.update(stringToSign, 'utf8')
  return verifier.verify(certificate.publicKey, message.Signature, 'base64')
}

async function countAcceptedMessageOnce(rawMessageId: string, inboxId: string) {
  const counted = await RawInboundMessage.findOneAndUpdate(
    { _id: rawMessageId, capacityCounted: false },
    { $set: { capacityCounted: true } },
    { new: true },
  ).exec()
  if (counted) await inboxService.incrementMessageCount(inboxId)
}

async function resolveInboxForRecipient(address: string) {
  const directInbox = await inboxService.findByAddress(address)
  if (directInbox) return { inbox: directInbox, aliasId: null }
  const alias = await Alias.findOne({
    address: address.toLowerCase(), isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).exec()
  if (!alias) return null
  const targetInbox = await inboxService.findByIdForDelivery(alias.targetInboxId.toString())
  if (!targetInbox) return null
  return { inbox: targetInbox, aliasId: alias._id.toString() }
}

function verifyMailgunSignature(timestamp: string, token: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(timestamp + token).digest('hex')
  const actualBytes = Buffer.from(signature)
  const expectedBytes = Buffer.from(expected)
  return actualBytes.length === expectedBytes.length && crypto.timingSafeEqual(actualBytes, expectedBytes)
}

function verifyDirectSesSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const actualBytes = Buffer.from(signature)
  const expectedBytes = Buffer.from(expected)
  return actualBytes.length === expectedBytes.length && crypto.timingSafeEqual(actualBytes, expectedBytes)
}

async function ensureQueueReady(): Promise<Queue> {
  if (!emailParsingQueue) await initQueue()
  return emailParsingQueue
}

function extractRecipientFromSes(record: any): string | null {
  const receipt = record.ses?.receipt
  if (receipt?.recipients?.[0]) return receipt.recipients[0].toLowerCase()
  const mail = record.ses?.mail
  if (mail?.destination?.[0]) return mail.destination[0].toLowerCase()
  return null
}

function extractRecipientFromMailgun(body: any): string | null {
  const value = body['X-Envelope-To'] || body.recipient || body['To']
  if (typeof value !== 'string') return null
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() || null
}

function extractRawMessageFromSes(record: any): string | null {
  const action = record.ses?.receipt?.action
  if (action?.type === 'S3' && action.bucketName && action.objectKey) {
    return `s3://${action.bucketName}/${action.objectKey}`
  }
  return null
}

function extractRawMessageFromMailgun(body: any): string | null {
  if (body['body-mime']) return body['body-mime']
  const headers = [
    (body.From || body.from) && `From: ${body.From || body.from}`,
    body.To && `To: ${body.To}`,
    body.Subject && `Subject: ${body.Subject}`,
    body.Date && `Date: ${body.Date}`,
    body['Message-Id'] && `Message-ID: ${body['Message-Id']}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
  ].filter(Boolean)
  const content = body['body-plain'] || body['stripped-text'] || body['body-html'] || body['stripped-html']
  return content ? `${headers.join('\r\n')}\r\n\r\n${content}` : null
}

async function storeRawMessage(data: {
  inboxId: string; provider: 'ses' | 'mailgun'; providerMessageId: string;
  rawMessageRef: string | null; rawContent: string | null; envelope: { from?: string; to: string }
}) {
  const key = { inboxId: data.inboxId, provider: data.provider, providerMessageId: data.providerMessageId }
  const existing = await RawInboundMessage.findOne(key).exec()
  if (existing) return { message: existing, created: false }
  try {
    const message = await RawInboundMessage.create(data)
    return { message, created: true }
  } catch (error: any) {
    if (error?.code !== 11000) throw error
    const message = await RawInboundMessage.findOne(key).exec()
    if (!message) throw error
    return { message, created: false }
  }
}

export const inboundWebhookService = {
  async handleSes(req: any, _res: any) {
    const snsMessage = req.body
    if (req.headers['x-amz-sns-message-type']) {
      if (!await verifySnsMessage(snsMessage)) {
        logger.warn('Invalid SES SNS signature')
        throw new AppError(401, 'INVALID_SIGNATURE', 'Invalid webhook signature')
      }
      if (snsMessage.Type !== req.headers['x-amz-sns-message-type']) {
        throw new AppError(400, 'SNS_TYPE_MISMATCH', 'SNS message type header does not match its payload')
      }
      if (env.SES_SNS_TOPIC_ARN && snsMessage.TopicArn !== env.SES_SNS_TOPIC_ARN) {
        throw new AppError(401, 'INVALID_TOPIC', 'Unexpected SNS topic')
      }
      if (env.NODE_ENV === 'production' && !env.SES_SNS_TOPIC_ARN) {
        throw new AppError(503, 'WEBHOOK_NOT_CONFIGURED', 'SES SNS topic ARN is not configured')
      }
    } else {
      const signature = req.headers['x-webhook-signature']
      if (!env.WEBHOOK_SECRET_SES) {
        throw new AppError(503, 'WEBHOOK_NOT_CONFIGURED', 'Direct SES webhook verification is not configured')
      }
      if (typeof signature !== 'string' || !verifyDirectSesSignature(JSON.stringify(req.body), signature, env.WEBHOOK_SECRET_SES)) {
        throw new AppError(401, 'INVALID_SIGNATURE', 'Invalid webhook signature')
      }
    }

    let sesPayload = snsMessage
    if (req.headers['x-amz-sns-message-type']) {
      if (snsMessage.Type !== 'Notification' || typeof snsMessage.Message !== 'string') {
        throw new AppError(400, 'UNSUPPORTED_SNS_MESSAGE', 'Expected an SNS notification containing an SES event')
      }
      try { sesPayload = JSON.parse(snsMessage.Message) } catch {
        throw new AppError(400, 'INVALID_SNS_MESSAGE', 'SNS message did not contain valid SES JSON')
      }
    }

    const queue = await ensureQueueReady()
    const records = sesPayload.Records || (sesPayload.mail && sesPayload.receipt ? [{ ses: sesPayload }] : [])
    const results = []

    for (const record of records) {
      const recipient = extractRecipientFromSes(record)
      if (!recipient) {
        logger.warn('No recipient found in SES record')
        continue
      }

      const resolved = await resolveInboxForRecipient(recipient)
      const inbox = resolved?.inbox
      if (!inbox) {
        logger.warn({ recipient }, 'Inbox not found for recipient')
        continue
      }

      const rawMessageRef = extractRawMessageFromSes(record)
      const messageId = record.ses?.mail?.messageId || crypto.randomUUID()
      const priorRaw = await RawInboundMessage.findOne({ inboxId: inbox._id, provider: 'ses', providerMessageId: messageId }).exec()
      if (!priorRaw && !await inboxService.checkCapacity(inbox._id.toString())) {
        logger.warn({ inboxId: inbox._id }, 'Inbox at capacity')
        continue
      }

      const raw = await storeRawMessage({
        inboxId: inbox._id.toString(), provider: 'ses', providerMessageId: messageId,
        rawMessageRef, rawContent: null, envelope: { from: record.ses?.mail?.source, to: recipient },
      })
      await queue.add('parseEmail', {
        inboxId: inbox._id.toString(),
        messageId,
        rawInboundMessageId: raw.message._id.toString(),
        rawMessageRef,
        provider: 'ses',
        recipient,
        envelope: {
          from: record.ses?.mail?.source,
          to: recipient,
        },
      }, { jobId: raw.message._id.toString(), attempts: 6, backoff: { type: 'exponential', delay: 1000 } })

      await countAcceptedMessageOnce(raw.message._id.toString(), inbox._id.toString())
      if (raw.created && resolved?.aliasId) await Alias.findByIdAndUpdate(resolved.aliasId, { $inc: { usageCount: 1 } }).exec()
      results.push({ inboxId: inbox._id, messageId })
    }

    logger.info({ count: results.length }, 'SES webhook processed')
    return results
  },

  async handleMailgun(req: any, _res: any) {
    const signature = req.body.signature || req.headers['x-mailgun-signature']
    const timestamp = req.body.timestamp || req.headers['x-mailgun-timestamp']
    const token = req.body.token || req.headers['x-mailgun-token']

    if (!env.WEBHOOK_SECRET_MAILGUN) {
      throw new AppError(503, 'WEBHOOK_NOT_CONFIGURED', 'Mailgun webhook verification is not configured')
    }
    if (typeof signature !== 'string' || typeof timestamp !== 'string' || typeof token !== 'string' ||
      !verifyMailgunSignature(timestamp, token, signature, env.WEBHOOK_SECRET_MAILGUN)) {
      logger.warn('Invalid Mailgun webhook signature')
      throw new AppError(401, 'INVALID_SIGNATURE', 'Invalid webhook signature')
    }
    const timestampSeconds = Number(timestamp)
    if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 15 * 60) {
      throw new AppError(401, 'STALE_SIGNATURE', 'Webhook signature timestamp is outside the accepted window')
    }

    const queue = await ensureQueueReady()

    const recipient = extractRecipientFromMailgun(req.body)
    if (!recipient) {
      logger.warn('No recipient found in Mailgun webhook')
      return []
    }

    const resolved = await resolveInboxForRecipient(recipient)
    const inbox = resolved?.inbox
    if (!inbox) {
      logger.warn({ recipient }, 'Inbox not found for recipient')
      return []
    }

    const rawContent = extractRawMessageFromMailgun(req.body)
    const messageId = req.body['Message-Id'] || crypto.randomUUID()
    const priorRaw = await RawInboundMessage.findOne({ inboxId: inbox._id, provider: 'mailgun', providerMessageId: messageId }).exec()
    if (!priorRaw && !await inboxService.checkCapacity(inbox._id.toString())) {
      logger.warn({ inboxId: inbox._id }, 'Inbox at capacity')
      return []
    }

    const raw = await storeRawMessage({
      inboxId: inbox._id.toString(), provider: 'mailgun', providerMessageId: messageId,
      rawMessageRef: null, rawContent,
      envelope: { from: req.body['X-Envelope-From'] || req.body.sender || req.body.From || req.body.from, to: recipient },
    })
    await queue.add('parseEmail', {
      inboxId: inbox._id.toString(),
      messageId,
      rawInboundMessageId: raw.message._id.toString(),
      rawMessageRef: null,
      provider: 'mailgun',
      recipient,
      envelope: {
        from: req.body['X-Envelope-From'] || req.body.sender || req.body.From || req.body.from,
        to: recipient,
      },
    }, { jobId: raw.message._id.toString(), attempts: 6, backoff: { type: 'exponential', delay: 1000 } })

    await countAcceptedMessageOnce(raw.message._id.toString(), inbox._id.toString())
    if (raw.created && resolved?.aliasId) await Alias.findByIdAndUpdate(resolved.aliasId, { $inc: { usageCount: 1 } }).exec()

    logger.info({ inboxId: inbox._id, messageId }, 'Mailgun webhook processed')
    return [{ inboxId: inbox._id, messageId }]
  },
}
