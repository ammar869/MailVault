import mongoose, { Schema, model, Document, Types } from 'mongoose'

export interface IRawInboundMessage extends Document {
  inboxId: Types.ObjectId
  provider: 'ses' | 'mailgun'
  providerMessageId: string
  rawMessageRef: string | null
  rawContent: string | null
  capacityCounted: boolean
  envelope: { from?: string; to: string }
  createdAt: Date
}

const rawInboundMessageSchema = new Schema<IRawInboundMessage>({
  inboxId: { type: Schema.Types.ObjectId, ref: 'Inbox', required: true, index: true },
  provider: { type: String, enum: ['ses', 'mailgun'], required: true },
  providerMessageId: { type: String, required: true },
  rawMessageRef: { type: String, default: null },
  rawContent: { type: String, default: null },
  capacityCounted: { type: Boolean, default: false },
  envelope: {
    from: { type: String },
    to: { type: String, required: true },
  },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false })

rawInboundMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 })
rawInboundMessageSchema.index({ inboxId: 1, provider: 1, providerMessageId: 1 }, { unique: true })

export const RawInboundMessage = mongoose.models.RawInboundMessage || model<IRawInboundMessage>('RawInboundMessage', rawInboundMessageSchema)
