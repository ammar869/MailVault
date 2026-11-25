import { Schema, model, models, Document, Types } from 'mongoose'

export interface IAuditLog extends Document {
  userId: Types.ObjectId | null
  action: string
  resourceType: string
  resourceId: Types.ObjectId | null
  metadata: Record<string, any>
  ip: string
  userAgent: string
  createdAt: Date
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

auditLogSchema.index({ userId: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ resourceType: 1, resourceId: 1 })
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }) // 90 days TTL

export const AuditLog = models.AuditLog || model<IAuditLog>('AuditLog', auditLogSchema)