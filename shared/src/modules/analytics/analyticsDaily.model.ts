import mongoose, { Schema, model, Document, Types } from 'mongoose'

export interface IAnalyticsDaily extends Document {
  userId: Types.ObjectId
  inboxId: Types.ObjectId | null
  date: Date
  emailsReceived: number
  emailsRead: number
  emailsDeleted: number
  otpCodesExtracted: number
  attachmentsReceived: number
  totalAttachmentSize: number
  aiProcessed: number
  aiTokensUsed: number
  webhooksDelivered: number
  webhooksFailed: number
  createdAt: Date
  updatedAt: Date
}

const analyticsDailySchema = new Schema<IAnalyticsDaily>(
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
    date: {
      type: Date,
      required: true,
      index: true,
    },
    emailsReceived: {
      type: Number,
      default: 0,
      min: 0,
    },
    emailsRead: {
      type: Number,
      default: 0,
      min: 0,
    },
    emailsDeleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    otpCodesExtracted: {
      type: Number,
      default: 0,
      min: 0,
    },
    attachmentsReceived: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAttachmentSize: {
      type: Number,
      default: 0,
      min: 0,
    },
    aiProcessed: {
      type: Number,
      default: 0,
      min: 0,
    },
    aiTokensUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    webhooksDelivered: {
      type: Number,
      default: 0,
      min: 0,
    },
    webhooksFailed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

analyticsDailySchema.index({ userId: 1, date: -1 })
analyticsDailySchema.index({ userId: 1, inboxId: 1, date: -1 }, { unique: true })

export const AnalyticsDaily = mongoose.models.AnalyticsDaily || model<IAnalyticsDaily>('AnalyticsDaily', analyticsDailySchema)