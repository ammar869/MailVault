import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { OutgoingWebhook } from './outgoingWebhook.model.js'
import { logger } from '../../utils/logger.js'
import { AppError } from '../../utils/appError.js'

function isPublicAddress(address: string): boolean {
  const version = isIP(address)
  if (version === 4) {
    const octets = address.split('.').map(Number)
    const [a, b] = octets
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0 && octets[2] === 113)
    )
  }
  if (version === 6) {
    const normalized = address.toLowerCase()
    if (normalized.startsWith('::ffff:')) return isPublicAddress(normalized.slice(7))
    if (normalized.startsWith('2001:db8:')) return false
    return normalized !== '::' && normalized !== '::1' &&
      !normalized.startsWith('fc') && !normalized.startsWith('fd') &&
      !normalized.startsWith('fe8') && !normalized.startsWith('fe9') &&
      !normalized.startsWith('fea') && !normalized.startsWith('feb') &&
      !normalized.startsWith('ff')
  }
  return false
}

export async function validateWebhookDestination(value: string): Promise<URL> {
  let url: URL
  try { url = new URL(value) } catch { throw new AppError(400, 'INVALID_WEBHOOK_URL', 'Webhook URL is invalid') }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || !url.hostname || url.port === '0') {
    throw new AppError(400, 'INVALID_WEBHOOK_URL', 'Webhook URLs must use HTTPS without credentials or fragments')
  }
  const hostname = url.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new AppError(400, 'UNSAFE_WEBHOOK_URL', 'Webhook URL cannot target a local host')
  }
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true }).catch(() => [])
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new AppError(400, 'UNSAFE_WEBHOOK_URL', 'Webhook URL must resolve only to public IP addresses')
  }
  return url
}

export const outgoingWebhookService = {
  async create(userId: string, input: any) {
    await validateWebhookDestination(input.url)
    const webhook = await OutgoingWebhook.create({
      userId,
      name: input.name,
      url: input.url,
      secret: input.secret,
      events: input.events,
      isActive: true,
      maxRetries: input.maxRetries || 5,
      backoffSchedule: input.backoffSchedule || [60, 300, 900, 3600, 21600],
      headers: input.headers || {},
    })

    logger.info({ webhookId: webhook._id, userId, name: input.name }, 'Outgoing webhook created')
    return webhook
  },

  async list(userId: string, query: any) {
    const filter: any = { userId }
    if (query.isActive !== undefined) filter.isActive = query.isActive

    const [webhooks, total] = await Promise.all([
      OutgoingWebhook.find(filter)
        .select('-secret')
        .sort({ createdAt: -1 })
        .skip(query.offset)
        .limit(query.limit)
        .exec(),
      OutgoingWebhook.countDocuments(filter),
    ])

    return { webhooks, total }
  },

  async getById(userId: string, webhookId: string) {
    const webhook = await OutgoingWebhook.findOne({ _id: webhookId, userId }).select('-secret').exec()
    if (!webhook) {
      throw new AppError(404, 'WEBHOOK_NOT_FOUND', 'Webhook not found')
    }
    return webhook
  },

  async update(userId: string, webhookId: string, input: any) {
    if (input.url) await validateWebhookDestination(input.url)
    const webhook = await OutgoingWebhook.findOneAndUpdate(
      { _id: webhookId, userId },
      { $set: input },
      { new: true, runValidators: true }
    ).select('-secret').exec()

    if (!webhook) {
      throw new AppError(404, 'WEBHOOK_NOT_FOUND', 'Webhook not found')
    }

    logger.info({ webhookId, userId }, 'Outgoing webhook updated')
    return webhook
  },

  async delete(userId: string, webhookId: string) {
    const webhook = await OutgoingWebhook.findOneAndDelete({ _id: webhookId, userId })
    if (!webhook) {
      throw new AppError(404, 'WEBHOOK_NOT_FOUND', 'Webhook not found')
    }

    logger.info({ webhookId, userId }, 'Outgoing webhook deleted')
    return true
  },

  async findByEvent(eventType: string) {
    return OutgoingWebhook.find({ events: eventType, isActive: true }).exec()
  },
}
