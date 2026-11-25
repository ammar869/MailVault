import { Schema, model, models, Document, Types } from 'mongoose'

export interface IAttachment extends Document {
  emailId: Types.ObjectId
  filename: string
  mimeType: string
  size: number
  s3Key: string
  s3Bucket: string
  virusScanStatus: 'pending' | 'clean' | 'infected'
  createdAt: Date
}

const attachmentSchema = new Schema<IAttachment>(
  {
    emailId: {
      type: Schema.Types.ObjectId,
      ref: 'Email',
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    s3Key: {
      type: String,
      required: true,
    },
    s3Bucket: {
      type: String,
      required: true,
    },
    virusScanStatus: {
      type: String,
      enum: ['pending', 'clean', 'infected'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

attachmentSchema.index({ emailId: 1 })
attachmentSchema.index({ s3Key: 1 }, { unique: true })

export const Attachment = models.Attachment || model<IAttachment>('Attachment', attachmentSchema)