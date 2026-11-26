import { Schema, model, models, Document, Types } from 'mongoose'

export type WebhookEventType = 'email.new' | 'email.read' | 'email.deleted' | 'otp.extracted' | 'inbox.expired' | 'inbox.created' | 'alias.created'

export interface IOutgoingWebhook extends Document {
  userId: Types.ObjectId
  name: string
  url: string
  secret: string
  events: WebhookEventType[]
  isActive: boolean
  retryCount: number
  maxRetries: number
  backoffSchedule: number[]
  headers: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

const outgoingWebhookSchema = new Schema<IOutgoingWebhook>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    secret: {
      type: String,
      required: true,
    },
    events: [{
      type: String,
      enum: ['email.new', 'email.read', 'email.deleted', 'otp.extracted', 'inbox.expired', 'inbox.created', 'alias.created'],
      required: true,
    }],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 5,
      min: 0,
      max: 10,
    },
    backoffSchedule: {
      type: [Number],
      default: [60, 300, 900, 3600, 21600], // 1m, 5m, 15m, 1h, 6h
    },
    headers: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

outgoingWebhookSchema.index({ userId: 1, isActive: 1 })

export const OutgoingWebhook = models.OutgoingWebhook || model<IOutgoingWebhook>('OutgoingWebhook', outgoingWebhookSchema)