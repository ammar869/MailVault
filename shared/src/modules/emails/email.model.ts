import mongoose, { Schema, model, Document, Types } from 'mongoose'

export interface IEmailAddress {
  name: string
  address: string
}

export type EmailStatus = 'new' | 'read' | 'archived' | 'deleted'

export interface IEmail extends Document {
  inboxId: Types.ObjectId
  messageId: string
  from: IEmailAddress
  to: IEmailAddress[]
  cc: IEmailAddress[]
  bcc: IEmailAddress[]
  subject: string
  textBody: string
  htmlBody: string
  receivedAt: Date
  parsedAt: Date
  size: number
  status: EmailStatus
  readAt: Date | null
  attachments: Types.ObjectId[]
  aiSummary: string | null
  aiCategory: string | null
  riskScore: number | null
  riskFlags: string[]
  otpCodes: string[]
  createdAt: Date
  updatedAt: Date
}

const emailSchema = new Schema<IEmail>(
  {
    inboxId: {
      type: Schema.Types.ObjectId,
      ref: 'Inbox',
      required: true,
      index: true,
    },
    messageId: {
      type: String,
      required: true,
      index: true,
    },
    from: {
      name: { type: String, default: '' },
      address: { type: String, required: true },
    },
    to: [{
      name: { type: String, default: '' },
      address: { type: String, required: true },
    }],
    cc: [{
      name: { type: String, default: '' },
      address: { type: String, required: true },
    }],
    bcc: [{
      name: { type: String, default: '' },
      address: { type: String, required: true },
    }],
    subject: {
      type: String,
      default: '',
    },
    textBody: {
      type: String,
      default: '',
    },
    htmlBody: {
      type: String,
      default: '',
    },
    receivedAt: {
      type: Date,
      required: true,
      index: true,
    },
    parsedAt: {
      type: Date,
      default: Date.now,
    },
    size: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['new', 'read', 'archived', 'deleted'],
      default: 'new',
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    attachments: [{
      type: Schema.Types.ObjectId,
      ref: 'Attachment',
    }],
    aiSummary: {
      type: String,
      default: null,
    },
    aiCategory: {
      type: String,
      default: null,
    },
    riskScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    riskFlags: [{
      type: String,
    }],
    otpCodes: [{
      type: String,
    }],
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

emailSchema.index({ inboxId: 1, receivedAt: -1 })
emailSchema.index({ inboxId: 1, messageId: 1 }, { unique: true })
emailSchema.index({ inboxId: 1, status: 1 })
emailSchema.index({ aiCategory: 1 })

export const Email = mongoose.models.Email || model<IEmail>('Email', emailSchema)