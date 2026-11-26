import { Router } from 'express'
import { inboundWebhookController } from './inbound.controller.js'
import { sesWebhookSchema, mailgunWebhookSchema } from './inbound.schema.js'
import { validate } from '../../middleware/validate.js'
import type { NextFunction, Request, Response } from 'express'

export const inboundWebhookRouter = Router()

inboundWebhookRouter.post('/ses', validate(sesWebhookSchema), inboundWebhookController.ses)
inboundWebhookRouter.post('/mailgun', parseMailgunMultipart, validate(mailgunWebhookSchema), inboundWebhookController.mailgun)

async function parseMailgunMultipart(req: Request, res: Response, next: NextFunction) {
  const contentType = req.headers['content-type'] || ''
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)
  if (!contentType.toLowerCase().startsWith('multipart/form-data') || !boundaryMatch) return next()

  const boundary = Buffer.from(`--${(boundaryMatch[1] || boundaryMatch[2]).trim()}`)
  const chunks: Buffer[] = []
  let totalSize = 0
  req.on('data', (chunk: Buffer) => {
    totalSize += chunk.length
    if (totalSize > 30 * 1024 * 1024) {
      res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Webhook payload exceeds 30 MB' } })
      req.destroy()
      return
    }
    chunks.push(chunk)
  })
  req.on('error', next)
  req.on('end', () => {
    if (res.headersSent) return
    const body = Buffer.concat(chunks)
    const fields: Record<string, string> = {}
    let start = body.indexOf(boundary)
    while (start !== -1) {
      start += boundary.length
      if (body.subarray(start, start + 2).toString() === '--') break
      if (body.subarray(start, start + 2).toString() === '\r\n') start += 2
      const nextBoundary = body.indexOf(boundary, start)
      if (nextBoundary === -1) break
      let part = body.subarray(start, nextBoundary)
      if (part.subarray(-2).toString() === '\r\n') part = part.subarray(0, -2)
      const separator = part.indexOf(Buffer.from('\r\n\r\n'))
      if (separator !== -1) {
        const headers = part.subarray(0, separator).toString('utf8')
        const disposition = headers.match(/content-disposition:\s*form-data;[^\r\n]*name="([^"]+)"([^\r\n]*)/i)
        if (disposition && !/filename="/i.test(disposition[2])) {
          fields[disposition[1]] = part.subarray(separator + 4).toString('utf8')
        }
      }
      start = nextBoundary
    }
    req.body = fields
    next()
  })
}
