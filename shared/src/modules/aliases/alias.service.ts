import { Alias } from './alias.model.js'
import { Inbox } from '../inboxes/inbox.model.js'
import { logger } from '../../utils/logger.js'

export const aliasService = {
  async create(userId: string, input: any) {
    const targetInbox = await Inbox.findById(input.targetInboxId).exec()
    if (!targetInbox) {
      throw new Error('TARGET_INBOX_NOT_FOUND')
    }
    if (targetInbox.userId.toString() !== userId) {
      throw new Error('FORBIDDEN')
    }

    const address = `${input.localPart}@${input.domain}`

    const existing = await Alias.findOne({ address: address.toLowerCase() }).exec()
    if (existing) {
      throw new Error('ADDRESS_EXISTS')
    }

    const alias = await Alias.create({
      userId,
      address: address.toLowerCase(),
      domain: input.domain.toLowerCase(),
      targetInboxId: input.targetInboxId,
      isActive: input.isActive ?? true,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    })

    logger.info({ aliasId: alias._id, userId, address }, 'Alias created')
    return alias
  },

  async list(userId: string, query: any) {
    const filter: any = { userId }
    if (query.isActive !== undefined) filter.isActive = query.isActive
    if (query.targetInboxId) filter.targetInboxId = query.targetInboxId

    const [aliases, total] = await Promise.all([
      Alias.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.offset)
        .limit(query.limit)
        .exec(),
      Alias.countDocuments(filter),
    ])

    return { aliases, total }
  },

  async getById(userId: string, aliasId: string) {
    const alias = await Alias.findOne({
      _id: aliasId,
      userId,
    }).exec()

    if (!alias) {
      throw new Error('ALIAS_NOT_FOUND')
    }

    return alias
  },

  async update(userId: string, aliasId: string, input: any) {
    const alias = await Alias.findOneAndUpdate(
      { _id: aliasId, userId },
      { $set: input },
      { new: true, runValidators: true }
    ).exec()

    if (!alias) {
      throw new Error('ALIAS_NOT_FOUND')
    }

    logger.info({ aliasId, userId }, 'Alias updated')
    return alias
  },

  async delete(userId: string, aliasId: string) {
    const alias = await Alias.findOneAndDelete({
      _id: aliasId,
      userId,
    })

    if (!alias) {
      throw new Error('ALIAS_NOT_FOUND')
    }

    logger.info({ aliasId, userId }, 'Alias deleted')
    return true
  },

  async findByAddress(address: string) {
    return Alias.findOne({ address: address.toLowerCase(), isActive: true }).exec()
  },

  async incrementUsage(aliasId: string) {
    await Alias.findByIdAndUpdate(aliasId, { $inc: { usageCount: 1 } }).exec()
  },
}