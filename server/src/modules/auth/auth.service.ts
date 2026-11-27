import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { User } from './user.model.js'
import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { RegisterInput, LoginInput, RefreshInput } from './auth.schema.js'

const encoder = new TextEncoder()

const accessSecretKey = encoder.encode(env.JWT_ACCESS_SECRET)
const refreshSecretKey = encoder.encode(env.JWT_REFRESH_SECRET)

export interface TokenPayload {
  userId: string
  email: string
  role: string
  type: 'access' | 'refresh'
  tokenVersion?: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS)
}

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

export const generateTokens = async (user: { _id: string; email: string; role: string; tokenVersion?: number }): Promise<AuthTokens> => {
  const payload: Omit<TokenPayload, 'type'> = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion ?? 0,
  }

  const accessToken = await new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(accessSecretKey)

  const refreshToken = await new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(refreshSecretKey)

  return { accessToken, refreshToken }
}

export const verifyAccessToken = async (token: string): Promise<TokenPayload> => {
  const { payload } = await jwtVerify(token, accessSecretKey)
  const parsed = payload as unknown as TokenPayload
  const user = await User.findById(parsed.userId).select('tokenVersion').lean().exec()
  if (!user || (parsed.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) throw new Error('Revoked access token')
  return parsed
}

export const verifyRefreshToken = async (token: string): Promise<TokenPayload> => {
  const { payload } = await jwtVerify(token, refreshSecretKey)
  const parsed = payload as unknown as TokenPayload
  const user = await User.findById(parsed.userId).select('tokenVersion').lean().exec()
  if (!user || (parsed.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) throw new Error('Revoked refresh token')
  return parsed
}

export const register = async (input: RegisterInput): Promise<{ user: any; tokens: AuthTokens }> => {
  const existingUser = await User.findOne({ email: input.email })
  if (existingUser) {
    throw new AppError(409, 'EMAIL_EXISTS', 'Email already registered')
  }

  const passwordHash = await hashPassword(input.password)

  const user = await User.create({
    email: input.email,
    name: input.name || null,
    passwordHash,
  })

  const tokens = await generateTokens(user)

  logger.info({ userId: user._id }, 'User registered')

  const userResponse = {
    id: user._id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    role: user.role,
    plan: user.plan,
    createdAt: user.createdAt,
  }

  return { user: userResponse, tokens }
}

export const login = async (input: LoginInput): Promise<{ user: any; tokens: AuthTokens }> => {
  const user = await User.findOne({ email: input.email }).select('+passwordHash')
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  }

  const isValid = await verifyPassword(input.password, user.passwordHash)
  if (!isValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  }

  const tokens = await generateTokens(user)

  logger.info({ userId: user._id }, 'User logged in')

  const userResponse = {
    id: user._id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    role: user.role,
    plan: user.plan,
    createdAt: user.createdAt,
  }

  return { user: userResponse, tokens }
}

export const refreshTokens = async (input: RefreshInput): Promise<AuthTokens> => {
  let payload: TokenPayload
  try {
    payload = await verifyRefreshToken(input.refreshToken)
  } catch {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token')
  }

  if (payload.type !== 'refresh') {
    throw new AppError(401, 'INVALID_TOKEN_TYPE', 'Invalid token type')
  }

  const user = await User.findById(payload.userId)
  if (!user) {
    throw new AppError(401, 'USER_NOT_FOUND', 'User no longer exists')
  }

  return generateTokens(user)
}

export const getMe = async (userId: string) => {
  const user = await User.findById(userId)
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
  }

  return {
    id: user._id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    role: user.role,
    plan: user.plan,
    createdAt: user.createdAt,
  }
}

export const updateProfile = async (userId: string, input: { name: string }) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { name: input.name.trim() || null } },
    { new: true, runValidators: true },
  ).exec()
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
  return { id: user._id.toString(), email: user.email, name: user.name, emailVerified: user.emailVerified, role: user.role, plan: user.plan, createdAt: user.createdAt }
}

export const changePassword = async (userId: string, input: { currentPassword: string; newPassword: string }): Promise<void> => {
  const user = await User.findById(userId).select('+passwordHash').exec()
  if (!user || !await verifyPassword(input.currentPassword, user.passwordHash)) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect')
  }
  user.passwordHash = await hashPassword(input.newPassword)
  user.tokenVersion = (user.tokenVersion ?? 0) + 1
  await user.save()
}

export const revokeAllSessions = async (userId: string): Promise<void> => {
  const result = await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } }).exec()
  if (!result.matchedCount) throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
}
