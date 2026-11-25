import { Schema, model, models, Document, Types } from 'mongoose'

export type ApiKeyScope = 'emails:read' | 'emails:write' | 'inboxes:read' | 'inboxes:write' | 'aliases:read' | 'aliases:write' | 'ai:read' | 'analytics:read' | 'webhooks:read' | 'webhooks:write' | '*'

export interface IApiKey extends Document {
  userId: Types.ObjectId
  name: string
  keyHash: string
  keyPrefix: string
  scopes: ApiKeyScope[]
  rateLimit: number
  expiresAt: Date | null
  lastUsedAt: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const apiKeySchema = new Schema<IApiKey>(
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
    keyHash: {
      type: String,
      required: true,
    },
    keyPrefix: {
      type: String,
      required: true,
    },
    scopes: [{
      type: String,
      enum: ['emails:read', 'emails:write', 'inboxes:read', 'inboxes:write', 'aliases:read', 'aliases:write', 'ai:read', 'analytics:read', 'webhooks:read', 'webhooks:write', '*'],
    }],
    rateLimit: {
      type: Number,
      default: 1000,
      min: 1,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: { expireAfterSeconds: 0 },
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

apiKeySchema.index({ userId: 1, isActive: 1 })
apiKeySchema.index({ keyPrefix: 1 })

export const ApiKey = models.ApiKey || model<IApiKey>('ApiKey', apiKeySchema)