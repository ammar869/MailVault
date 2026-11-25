import { Schema, model, models, Document, Types } from 'mongoose'

export type InboxType = 'temporary' | 'disposable' | 'alias'

export interface IInbox extends Document {
  userId: Types.ObjectId
  address: string
  domain: string
  type: InboxType
  displayName: string
  expiresAt: Date
  isActive: boolean
  maxMessages: number
  messageCount: number
  aiEnabled: boolean
  settings: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

const inboxSchema = new Schema<IInbox>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    address: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    domain: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['temporary', 'disposable', 'alias'],
      required: true,
      index: true,
    },
    displayName: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    maxMessages: {
      type: Number,
      default: 100,
      min: 1,
    },
    messageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    aiEnabled: {
      type: Boolean,
      default: false,
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

inboxSchema.index({ userId: 1, isActive: 1 })
inboxSchema.index({ address: 1 }, { unique: true })
inboxSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const Inbox = models.Inbox || model<IInbox>('Inbox', inboxSchema)