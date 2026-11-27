import mongoose, { Schema, model, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  name: string | null
  passwordHash: string
  tokenVersion: number
  emailVerified: boolean
  role: 'owner' | 'admin'
  plan: 'free' | 'pro'
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, trim: true, maxlength: 100, default: null },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    tokenVersion: { type: Number, default: 0, min: 0 },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['owner', 'admin'],
      default: 'owner',
    },
    plan: {
      type: String,
      enum: ['free', 'pro'],
      default: 'free',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

userSchema.index({ email: 1 }, { unique: true })

export const User = mongoose.models.User || model<IUser>('User', userSchema)
