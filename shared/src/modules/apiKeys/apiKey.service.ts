import { ApiKey } from './apiKey.model.js'
import { randomBytes, createHash } from 'crypto'
import { logger } from '../../utils/logger.js'
import { AppError } from '../../utils/appError.js'

export const apiKeyService = {
  generateKey(): { key: string; hash: string; prefix: string } {
    const rawKey = randomBytes(32).toString('base64url')
    const prefix = `mvk_${randomBytes(4).toString('hex')}`
    const fullKey = `${prefix}_${rawKey}`
    const hash = createHash('sha256').update(fullKey).digest('hex')
    return { key: fullKey, hash, prefix }
  },

  async create(userId: string, input: any) {
    const { key, hash, prefix } = this.generateKey()

    const apiKey = await ApiKey.create({
      userId,
      name: input.name,
      keyHash: hash,
      keyPrefix: prefix,
      scopes: input.scopes,
      rateLimit: input.rateLimit || 1000,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isActive: true,
    })

    logger.info({ apiKeyId: apiKey._id, userId, name: input.name }, 'API key created')
    return { apiKey, key }
  },

  async list(userId: string, query: any) {
    const filter: any = { userId }
    if (query.isActive !== undefined) filter.isActive = query.isActive

    const [keys, total] = await Promise.all([
      ApiKey.find(filter)
        .select('-keyHash')
        .sort({ createdAt: -1 })
        .skip(query.offset)
        .limit(query.limit)
        .exec(),
      ApiKey.countDocuments(filter),
    ])

    return { keys, total }
  },

  async getById(userId: string, keyId: string) {
    const apiKey = await ApiKey.findOne({ _id: keyId, userId }).select('-keyHash').exec()
    if (!apiKey) {
      throw new AppError(404, 'API_KEY_NOT_FOUND', 'API key not found')
    }
    return apiKey
  },

  async update(userId: string, keyId: string, input: any) {
    const apiKey = await ApiKey.findOneAndUpdate(
      { _id: keyId, userId },
      { $set: input },
      { new: true, runValidators: true }
    ).select('-keyHash').exec()

    if (!apiKey) {
      throw new AppError(404, 'API_KEY_NOT_FOUND', 'API key not found')
    }

    logger.info({ apiKeyId: keyId, userId }, 'API key updated')
    return apiKey
  },

  async delete(userId: string, keyId: string) {
    const apiKey = await ApiKey.findOneAndDelete({ _id: keyId, userId })
    if (!apiKey) {
      throw new AppError(404, 'API_KEY_NOT_FOUND', 'API key not found')
    }

    logger.info({ apiKeyId: keyId, userId }, 'API key deleted')
    return true
  },

  async validate(key: string, requiredScope?: string) {
    const hash = createHash('sha256').update(key).digest('hex')
    const apiKey = await ApiKey.findOne({ keyHash: hash, isActive: true }).exec()

    if (!apiKey) {
      return { valid: false, reason: 'INVALID_KEY' }
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, reason: 'KEY_EXPIRED' }
    }

    if (requiredScope && !apiKey.scopes.includes('*') && !apiKey.scopes.includes(requiredScope)) {
      return { valid: false, reason: 'INSUFFICIENT_SCOPE', requiredScope }
    }

    // Update last used
    await ApiKey.findByIdAndUpdate(apiKey._id, { lastUsedAt: new Date() }).exec()

    return {
      valid: true,
      apiKey: {
        id: apiKey._id,
        userId: apiKey.userId,
        scopes: apiKey.scopes,
        rateLimit: apiKey.rateLimit,
      },
    }
  },
}