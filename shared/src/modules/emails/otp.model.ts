import mongoose, { Schema, model, Document, Types } from 'mongoose'

export interface IOtpRecord extends Document {
  emailId: Types.ObjectId
  code: string
  extractedAt: Date
  expiresAt: Date
  usedAt: Date | null
  usedBy: Types.ObjectId | null
}

const otpRecordSchema = new Schema<IOtpRecord>(
  {
    emailId: {
      type: Schema.Types.ObjectId,
      ref: 'Email',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    extractedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    usedAt: {
      type: Date,
      default: null,
    },
    usedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

otpRecordSchema.index({ emailId: 1 })
otpRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const OtpRecord = mongoose.models.OtpRecord || model<IOtpRecord>('OtpRecord', otpRecordSchema)