import mongoose, { Schema, model, Document, Types } from 'mongoose'

export interface IAlias extends Document {
  userId: Types.ObjectId
  address: string
  domain: string
  targetInboxId: Types.ObjectId
  isActive: boolean
  expiresAt: Date | null
  usageCount: number
  createdAt: Date
  updatedAt: Date
}

const aliasSchema = new Schema<IAlias>(
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
    targetInboxId: {
      type: Schema.Types.ObjectId,
      ref: 'Inbox',
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: { expireAfterSeconds: 0 },
    },
    usageCount: {
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

aliasSchema.index({ userId: 1, isActive: 1 })
aliasSchema.index({ address: 1 }, { unique: true })
aliasSchema.index({ targetInboxId: 1 })
aliasSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const Alias = mongoose.models.Alias || model<IAlias>('Alias', aliasSchema)