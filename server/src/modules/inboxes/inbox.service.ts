import crypto from 'crypto'
import { Inbox } from './inbox.model.js'
import { AppError } from '../../middleware/errorHandler.js'
import { auditService } from '@mailvault/shared'
import { logger } from '../../utils/logger.js'
import type { CreateInboxInput, UpdateInboxInput, ListInboxesQuery } from './inbox.schema.js'

const DOMAIN_POOL = ['mailvault.app', 'tempmail.io', 'disposable.email']

function calculateExpiresAt(ttlHours?: number, ttlDays?: number, expiresAt?: string): Date {
  if (expiresAt) {
    return new Date(expiresAt)
  }
  const hours = ttlHours ?? (ttlDays ?? 7) * 24
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

export const inboxService = {
  async create(userId: string, input: CreateInboxInput) {
    const domain = (input.domain || DOMAIN_POOL[Math.floor(Math.random() * DOMAIN_POOL.length)]).toLowerCase()
    const localPart = input.localPart?.toLowerCase() || `${input.type === 'alias' ? 'alias' : 'temp'}-${crypto.randomBytes(5).toString('hex')}`
    const address = `${localPart}@${domain}`
    const exists = await Inbox.exists({ address })
    if (exists) throw new AppError(409, 'ADDRESS_EXISTS', 'Inbox address already exists')
    const expiresAt = calculateExpiresAt(input.ttlHours, input.ttlDays, input.expiresAt)

    const inbox = await Inbox.create({
      userId,
      address,
      domain,
      type: input.type,
      displayName: input.displayName || address.split('@')[0],
      expiresAt,
      maxMessages: input.capacity ?? input.maxMessages ?? 100,
      aiEnabled: input.aiEnabled || false,
      settings: input.settings || {},
    })

    logger.info({ inboxId: inbox._id, userId }, 'Inbox created')
    await auditService.log({ userId, action: 'inbox.created', resourceType: 'inbox', resourceId: inbox._id.toString(), metadata: { address, type: inbox.type } })
    return inbox
  },

  async list(userId: string, query: ListInboxesQuery) {
    const filter: Record<string, any> = { userId, expiresAt: { $gt: new Date() } }
    if (query.type) filter.type = query.type
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
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).exec()

    if (!inbox) {
      throw new AppError(404, 'INBOX_NOT_FOUND', 'Inbox not found')
    }

    return inbox
  },

  async update(userId: string, inboxId: string, input: UpdateInboxInput) {
    const inbox = await Inbox.findOneAndUpdate(
      { _id: inboxId, userId, isActive: true, expiresAt: { $gt: new Date() } },
      { $set: input },
      { new: true, runValidators: true }
    ).exec()

    if (!inbox) {
      throw new AppError(404, 'INBOX_NOT_FOUND', 'Inbox not found')
    }

    logger.info({ inboxId, userId }, 'Inbox updated')
    await auditService.log({ userId, action: 'inbox.updated', resourceType: 'inbox', resourceId: inbox._id.toString() })
    return inbox
  },

  async delete(userId: string, inboxId: string) {
    const inbox = await Inbox.findOneAndUpdate(
      { _id: inboxId, userId },
      { $set: { isActive: false } },
      { new: true },
    )

    if (!inbox) {
      throw new AppError(404, 'INBOX_NOT_FOUND', 'Inbox not found')
    }

    logger.info({ inboxId, userId }, 'Inbox deleted')
    await auditService.log({ userId, action: 'inbox.deleted', resourceType: 'inbox', resourceId: inbox._id.toString() })
    return true
  },

  async findByAddress(address: string) {
    return Inbox.findOne({ address: address.toLowerCase(), isActive: true, expiresAt: { $gt: new Date() } }).exec()
  },

  async findByIdForDelivery(inboxId: string) {
    return Inbox.findOne({ _id: inboxId, isActive: true, expiresAt: { $gt: new Date() } }).exec()
  },

  async incrementMessageCount(inboxId: string) {
    await Inbox.findByIdAndUpdate(inboxId, { $inc: { messageCount: 1 } }).exec()
  },

  async checkCapacity(inboxId: string): Promise<boolean> {
    const inbox = await Inbox.findById(inboxId).select('messageCount maxMessages').exec()
    if (!inbox) return false
    return inbox.messageCount < inbox.maxMessages
  },
}
