import { Schema, model, models, Document, Types } from 'mongoose'

export type WebhookDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'cancelled'

export interface IWebhookDelivery extends Document {
  webhookId: Types.ObjectId
  eventType: string
  payload: Record<string, any>
  idempotencyKey: string
  attempt: number
  status: WebhookDeliveryStatus
  responseStatus: number | null
  responseBody: string | null
  error: string | null
  nextRetryAt: Date | null
  deliveredAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const webhookDeliverySchema = new Schema<IWebhookDelivery>(
  {
    webhookId: {
      type: Schema.Types.ObjectId,
      ref: 'OutgoingWebhook',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      index: true,
    },
    attempt: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'delivered', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    responseStatus: {
      type: Number,
      default: null,
    },
    responseBody: {
      type: String,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    nextRetryAt: {
      type: Date,
      default: null,
      index: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

webhookDeliverySchema.index({ idempotencyKey: 1 }, { unique: true })
webhookDeliverySchema.index({ webhookId: 1, status: 1 })
webhookDeliverySchema.index({ nextRetryAt: 1, status: 1 })
webhookDeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }) // 30 days TTL

export const WebhookDelivery = models.WebhookDelivery || model<IWebhookDelivery>('WebhookDelivery', webhookDeliverySchema)