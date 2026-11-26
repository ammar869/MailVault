import { WebhookDelivery } from './webhookDelivery.model.js'
import { OutgoingWebhook } from './outgoingWebhook.model.js'
import { logger } from '../../utils/logger.js'
import { createHmac } from 'crypto'
import { analyticsService } from '../analytics/analytics.service.js'

interface DeliveryResult {
  success: boolean
  statusCode?: number
  body?: string
  error?: string
}

export const webhookDeliveryService = {
  generateIdempotencyKey(eventType: string, resourceId: string, webhookId = 'default'): string {
    return `wh_${eventType}_${resourceId}_${webhookId}`
  },

  signPayload(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex')
  },

  async scheduleDelivery(webhook: any, eventType: string, payload: any, idempotencyKey: string): Promise<void> {
    await WebhookDelivery.findOneAndUpdate(
      { idempotencyKey },
      { $setOnInsert: {
        webhookId: webhook._id, eventType, payload, idempotencyKey,
        attempt: 1, status: 'pending', nextRetryAt: new Date(),
      } },
      { upsert: true, new: true },
    ).exec()

    logger.info({ webhookId: webhook._id, eventType, idempotencyKey }, 'Webhook delivery scheduled')
  },

  async processDelivery(deliveryId: string): Promise<DeliveryResult> {
    const delivery = await WebhookDelivery.findById(deliveryId).populate('webhookId').exec()
    if (!delivery) {
      return { success: false, error: 'Delivery not found' }
    }

    if (delivery.status !== 'pending') {
      return { success: false, error: `Delivery not in pending status: ${delivery.status}` }
    }

    const webhook = delivery.webhookId as any
    if (!webhook || !webhook.isActive) {
      delivery.status = 'cancelled'
      delivery.error = 'Webhook inactive or deleted'
      await delivery.save()
      return { success: false, error: 'Webhook inactive' }
    }

    const payloadStr = JSON.stringify(delivery.payload)
    const signature = this.signPayload(payloadStr, webhook.secret)

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          ...webhook.headers,
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': delivery.eventType,
          'X-Webhook-Delivery': delivery.idempotencyKey,
          'User-Agent': 'MailVault-Webhook/1.0',
        },
        body: payloadStr,
        signal: AbortSignal.timeout(10_000),
      })

      const responseBody = await response.text().catch(() => '')

      delivery.responseStatus = response.status
      delivery.responseBody = responseBody.slice(0, 1000)
      delivery.attempt += 1

      if (response.ok) {
        delivery.status = 'delivered'
        delivery.deliveredAt = new Date()
        delivery.nextRetryAt = null
        await delivery.save()
        const userId = webhook.userId?.toString()
        const inboxId = delivery.payload?.email?.inboxId?.toString() || null
        if (userId) {
          await analyticsService.recordEvent(userId, inboxId, 'webhook.delivered', { deliveryId, webhookId: webhook._id })
          await analyticsService.incrementDailyStat(userId, inboxId, 'webhooksDelivered')
        }
        logger.info({ deliveryId, webhookId: webhook._id }, 'Webhook delivered successfully')
        return { success: true, statusCode: response.status, body: responseBody }
      } else {
        throw new Error(`HTTP ${response.status}: ${responseBody}`)
      }
    } catch (error: any) {
      delivery.error = error.message

      if (delivery.attempt >= webhook.maxRetries) {
        delivery.status = 'failed'
        delivery.nextRetryAt = null
        await delivery.save()
        const userId = webhook.userId?.toString()
        const inboxId = delivery.payload?.email?.inboxId?.toString() || null
        if (userId) {
          await analyticsService.recordEvent(userId, inboxId, 'webhook.failed', { deliveryId, webhookId: webhook._id })
          await analyticsService.incrementDailyStat(userId, inboxId, 'webhooksFailed')
        }
        logger.error({ deliveryId, webhookId: webhook._id, error: error.message }, 'Webhook delivery failed permanently')
        return { success: false, error: error.message }
      }

      // Schedule retry
      const backoffSeconds = webhook.backoffSchedule[delivery.attempt - 1] || webhook.backoffSchedule[webhook.backoffSchedule.length - 1]
      delivery.nextRetryAt = new Date(Date.now() + backoffSeconds * 1000)
      delivery.status = 'pending'
      await delivery.save()

      logger.warn({ deliveryId, webhookId: webhook._id, attempt: delivery.attempt, nextRetryAt: delivery.nextRetryAt }, 'Webhook delivery failed, retry scheduled')
      return { success: false, error: error.message }
    }
  },

  async getPendingDeliveries(limit = 100) {
    const now = new Date()
    return WebhookDelivery.find({
      status: 'pending',
      nextRetryAt: { $lte: now },
    })
      .sort({ nextRetryAt: 1 })
      .limit(limit)
      .exec()
  },
}
