import mongoose, { Schema, model, Document, Types } from 'mongoose'

export interface IAIResult extends Document {
  emailId: Types.ObjectId
  inboxId: Types.ObjectId
  userId: Types.ObjectId
  summary: string | null
  category: string | null
  subCategory: string | null
  links: string[]
  phishingScore: number | null
  phishingReasons: string[]
  tokensUsed: number
  llmModel: string
  status: 'pending' | 'completed' | 'failed'
  error: string | null
  createdAt: Date
  updatedAt: Date
}

const aiResultSchema = new Schema<IAIResult>(
  {
    emailId: {
      type: Schema.Types.ObjectId,
      ref: 'Email',
      required: true,
      index: true,
    },
    inboxId: {
      type: Schema.Types.ObjectId,
      ref: 'Inbox',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    summary: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      default: null,
      index: true,
    },
    subCategory: {
      type: String,
      default: null,
    },
    links: [{
      type: String,
    }],
    phishingScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    phishingReasons: [{
      type: String,
    }],
    tokensUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    llmModel: {
      type: String,
      default: 'gpt-4o-mini',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

aiResultSchema.index({ emailId: 1 }, { unique: true })
aiResultSchema.index({ userId: 1, createdAt: -1 })
aiResultSchema.index({ inboxId: 1, createdAt: -1 })

export const AIResult = mongoose.models.AIResult || model<IAIResult>('AIResult', aiResultSchema)