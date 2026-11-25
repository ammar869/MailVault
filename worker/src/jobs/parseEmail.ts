import 'dotenv/config'
import { simpleParser, ParsedMail, AddressObject, EmailAddress } from 'mailparser'
import { connectDB } from '../config/database.js'
import { emailService } from '../modules/emails/email.service.js'
import { uploadToS3, generateS3Key } from '../utils/s3.js'
import { extractOtpCodes, extractLinks } from '../utils/extract.js'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'
import { emailParsingQueue } from '../index.js'

interface ParseEmailJobData {
  inboxId: string
  messageId: string
  rawMessageRef: string | null
  provider: 'ses' | 'mailgun'
  recipient: string
  envelope: {
    from: string
    to: string
  }
}

async function fetchRawMessage(rawMessageRef: string | null, provider: string): Promise<Buffer | null> {
  if (!rawMessageRef) return null

  if (rawMessageRef.startsWith('s3://')) {
    const [, bucket, ...keyParts] = rawMessageRef.replace('s3://', '').split('/')
    const key = keyParts.join('/')
    try {
      const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
      const s3Client = new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY,
          secretAccessKey: env.S3_SECRET_KEY,
        },
        forcePathStyle: true,
      })
      const response = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
      const chunks: Uint8Array[] = []
      for await (const chunk of response.Body as any) {
        chunks.push(chunk)
      }
      return Buffer.concat(chunks)
    } catch (error) {
      logger.error({ err: error, rawMessageRef }, 'Failed to fetch from S3')
      return null
    }
  }

  return Buffer.from(rawMessageRef, 'utf-8')
}

function toAddressArray(addresses: AddressObject | AddressObject[] | undefined): AddressObject[] {
  if (!addresses) return []
  return Array.isArray(addresses) ? addresses : [addresses]
}

function parseAddresses(addresses: AddressObject | AddressObject[] | undefined): { name: string; address: string }[] {
  const arr = toAddressArray(addresses)
  const result: { name: string; address: string }[] = []
  
  for (const addrObj of arr) {
    if (addrObj.value && Array.isArray(addrObj.value)) {
      for (const emailAddr of addrObj.value) {
        if (emailAddr.address) {
          result.push({
            name: emailAddr.name || '',
            address: emailAddr.address,
          })
        }
      }
    }
  }
  
  return result.filter(a => a.address)
}

async function processAttachments(parsed: ParsedMail, emailId: string): Promise<{ filename: string; mimeType: string; size: number; s3Key: string; s3Bucket: string }[]> {
  const attachments = parsed.attachments || []
  const results = []

  for (const attachment of attachments) {
    if (!attachment.content) continue

    const content = Buffer.isBuffer(attachment.content) ? attachment.content : Buffer.from(attachment.content)
    const filename = attachment.filename || `attachment-${Date.now()}`
    const mimeType = attachment.contentType || 'application/octet-stream'
    const s3Key = generateS3Key('attachments', filename)

    await uploadToS3(s3Key, content, mimeType)

    results.push({
      filename,
      mimeType,
      size: content.length,
      s3Key,
      s3Bucket: env.S3_BUCKET,
    })
  }

  return results
}

export async function processParseEmailJob(jobData: ParseEmailJobData): Promise<void> {
  await connectDB()

  const rawMessage = await fetchRawMessage(jobData.rawMessageRef, jobData.provider)
  if (!rawMessage) {
    logger.warn({ messageId: jobData.messageId }, 'No raw message content available')
    return
  }

  const parsed = await simpleParser(rawMessage)

  const from = parsed.from ? { name: parsed.from.text || '', address: parsed.from.value?.[0]?.address || '' } : { name: '', address: jobData.envelope.from }
  const to = parseAddresses(parsed.to)
  const cc = parseAddresses(parsed.cc)
  const bcc = parseAddresses(parsed.bcc)

  const textBody = parsed.text || ''
  const htmlBody = parsed.html || ''

  const otpCodes = extractOtpCodes(textBody)
  const links = extractLinks(textBody)

  const attachments = await processAttachments(parsed, '')

  await emailService.create({
    inboxId: jobData.inboxId,
    messageId: jobData.messageId,
    from,
    to,
    cc,
    bcc,
    subject: parsed.subject || '',
    textBody,
    htmlBody,
    receivedAt: parsed.date || new Date(),
    size: rawMessage.length,
    attachments,
    otpCodes,
  })

  logger.info({ messageId: jobData.messageId, inboxId: jobData.inboxId, otpCount: otpCodes.length }, 'Email parsed and stored')
}

logger.info('Email parsing worker registered')