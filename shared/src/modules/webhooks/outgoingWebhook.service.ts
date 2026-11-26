import { OutgoingWebhook } from './outgoingWebhook.model.js'
import { logger } from '../../utils/logger.js'
import { AppError } from '../../utils/appError.js'

export const outgoingWebhookService = {
  async create(userId: string, input: any) {
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