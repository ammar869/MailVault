import { Inbox } from './inbox.model.js'
import { logger } from '../../utils/logger.js'
import { AppError } from '../../utils/appError.js'

export const inboxService = {
  async create(userId: string, input: any) {
    const address = `${input.localPart}@${input.domain}`

    const existing = await Inbox.findOne({ address: address.toLowerCase() }).exec()
    if (existing) {
      throw new AppError(409, 'ADDRESS_EXISTS', 'Inbox address already exists')
    }

    const capacity = input.capacity ?? 100
    const ttlDays = input.ttlDays ?? 7

    const inbox = await Inbox.create({
      userId,
      address: address.toLowerCase(),
      domain: input.domain.toLowerCase(),
      localPart: input.localPart.toLowerCase(),
      capacity,
      ttlDays,
      expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
      isActive: true,
    })

    logger.info({ inboxId: inbox._id, userId, address }, 'Inbox created')
    return inbox
  },

  async list(userId: string, query: any) {
    const filter: any = { userId }
    if (query.isActive !== undefined) filter.isActive = query.isActive

    const [inboxes, total] = await Promise.all([
      Inbox.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.offset)
        .limit(query.limit)
        .exec(),
      Inbox.countDocuments(filter),
    ])

    return { inboxes, total }
  },

  async getById(userId: string, inboxId: string) {
    const inbox = await Inbox.findOne({
      _id: inboxId,
      userId,
    }).exec()

    if (!inbox) {
      throw new AppError(404, 'INBOX_NOT_FOUND', 'Inbox not found')
    }

    return inbox
  },

  async update(userId: string, inboxId: string, input: any) {
    const inbox = await Inbox.findOneAndUpdate(
      { _id: inboxId, userId },
      { $set: input },
      { new: true, runValidators: true }
    ).exec()

    if (!inbox) {
      throw new AppError(404, 'INBOX_NOT_FOUND', 'Inbox not found')
    }

    logger.info({ inboxId, userId }, 'Inbox updated')
    return inbox
  },

  async delete(userId: string, inboxId: string) {
    const inbox = await Inbox.findOneAndDelete({
      _id: inboxId,
      userId,
    })

    if (!inbox) {
      throw new AppError(404, 'INBOX_NOT_FOUND', 'Inbox not found')
    }

    logger.info({ inboxId, userId }, 'Inbox deleted')
    return true
  },

  async getByAddress(address: string) {
    return Inbox.findOne({ address: address.toLowerCase(), isActive: true }).exec()
  },

  async incrementUsage(inboxId: string) {
    await Inbox.findByIdAndUpdate(inboxId, { $inc: { usageCount: 1 } }).exec()
  },
}