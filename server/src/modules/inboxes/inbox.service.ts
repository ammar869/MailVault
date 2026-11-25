import { Types } from 'mongoose'
import { Inbox } from './inbox.model.js'
import { AppError } from '../../middleware/errorHandler.js'
import { logger } from '../../utils/logger.js'
import type { CreateInboxInput, UpdateInboxInput, ListInboxesQuery } from './inbox.schema.js'

const DOMAIN_POOL = ['mailvault.example', 'temp.mailvault.app', 'disposable.mailvault.io']

function generateAddress(type: string, domain: string): string {
  const prefix = type === 'alias' ? 'alias' : 'temp'
  const random = Math.random().toString(36).substring(2, 10)
  return `${prefix}-${random}@${domain}`
}

function calculateExpiresAt(ttlHours?: number, expiresAt?: string): Date {
  if (expiresAt) {
    return new Date(expiresAt)
  }
  const hours = ttlHours || 24
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

export const inboxService = {
  async create(userId: string, input: CreateInboxInput) {
    const domain = DOMAIN_POOL[Math.floor(Math.random() * DOMAIN_POOL.length)]
    const address = generateAddress(input.type, domain)
    const expiresAt = calculateExpiresAt(input.ttlHours, input.expiresAt)

    const inbox = await Inbox.create({
      userId: new Types.ObjectId(userId),
      address,
      domain,
      type: input.type,
      displayName: input.displayName || address.split('@')[0],
      expiresAt,
      maxMessages: input.maxMessages || 100,
      aiEnabled: input.aiEnabled || false,
      settings: input.settings || {},
    })

    logger.info({ inboxId: inbox._id, userId, address }, 'Inbox created')
    return inbox
  },

  async list(userId: string, query: ListInboxesQuery) {
    const filter: Record<string, any> = { userId: new Types.ObjectId(userId) }
    if (query.type) filter.type = query.type
    if (query.isActive !== undefined) filter.isActive = query.isActive

    const [inboxes, total] = await Promise.all([
      Inbox.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.offset)
        .limit(query.limit)
        .lean()
        .exec(),
      Inbox.countDocuments(filter),
    ])

    return { inboxes, total }
  },

  async getById(userId: string, inboxId: string) {
    const inbox = await Inbox.findOne({
      _id: new Types.ObjectId(inboxId),
      userId: new Types.ObjectId(userId),
    }).lean().exec()

    if (!inbox) {
      throw new AppError(404, 'INBOX_NOT_FOUND', 'Inbox not found')
    }

    return inbox
  },

  async update(userId: string, inboxId: string, input: UpdateInboxInput) {
    const inbox = await Inbox.findOneAndUpdate(
      { _id: new Types.ObjectId(inboxId), userId: new Types.ObjectId(userId) },
      { $set: input },
      { new: true, runValidators: true }
    ).lean().exec()

    if (!inbox) {
      throw new AppError(404, 'INBOX_NOT_FOUND', 'Inbox not found')
    }

    logger.info({ inboxId, userId }, 'Inbox updated')
    return inbox
  },

  async delete(userId: string, inboxId: string) {
    const inbox = await Inbox.findOneAndDelete({
      _id: new Types.ObjectId(inboxId),
      userId: new Types.ObjectId(userId),
    })

    if (!inbox) {
      throw new AppError(404, 'INBOX_NOT_FOUND', 'Inbox not found')
    }

    logger.info({ inboxId, userId }, 'Inbox deleted')
    return true
  },

  async findByAddress(address: string) {
    return Inbox.findOne({ address: address.toLowerCase(), isActive: true }).lean().exec()
  },

  async incrementMessageCount(inboxId: string) {
    await Inbox.findByIdAndUpdate(inboxId, { $inc: { messageCount: 1 } }).exec()
  },

  async checkCapacity(inboxId: string): Promise<boolean> {
    const inbox = await Inbox.findById(inboxId).select('messageCount maxMessages').lean().exec()
    if (!inbox) return false
    return inbox.messageCount < inbox.maxMessages
  },
}