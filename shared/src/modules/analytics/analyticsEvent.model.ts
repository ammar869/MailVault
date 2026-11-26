import mongoose, { Schema, model, Document, Types } from 'mongoose'

export type AnalyticsEventType = 'email.received' | 'email.read' | 'email.deleted' | 'otp.extracted' | 'attachment.downloaded' | 'ai.completed' | 'webhook.delivered' | 'webhook.failed' | 'inbox.created' | 'inbox.expired' | 'alias.created'

export interface IAnalyticsEvent extends Document {
  userId: Types.ObjectId
  inboxId: Types.ObjectId | null
  eventType: AnalyticsEventType
  metadata: Record<string, any>
  createdAt: Date
}

const analyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    inboxId: {
      type: Schema.Types.ObjectId,
      ref: 'Inbox',
      default: null,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: ['email.received', 'email.read', 'email.deleted', 'otp.extracted', 'attachment.downloaded', 'ai.completed', 'webhook.delivered', 'webhook.failed', 'inbox.created', 'inbox.expired', 'alias.created'],
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
)

analyticsEventSchema.index({ userId: 1, createdAt: -1 })
analyticsEventSchema.index({ inboxId: 1, createdAt: -1 })
analyticsEventSchema.index({ eventType: 1, createdAt: -1 })
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }) // 90 days TTL

export const AnalyticsEvent = mongoose.models.AnalyticsEvent || model<IAnalyticsEvent>('AnalyticsEvent', analyticsEventSchema)