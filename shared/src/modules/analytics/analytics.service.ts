import { AnalyticsDaily } from './analyticsDaily.model.js'
import { AnalyticsEvent } from './analyticsEvent.model.js'
import { logger } from '../../utils/logger.js'
import { Types } from 'mongoose'

interface DailyStats {
  emailsReceived: number
  emailsRead: number
  emailsDeleted: number
  otpCodesExtracted: number
  attachmentsReceived: number
  totalAttachmentSize: number
  aiProcessed: number
  aiTokensUsed: number
  webhooksDelivered: number
  webhooksFailed: number
}

export const analyticsService = {
  async recordEvent(userId: string, inboxId: string | null, eventType: string, metadata: Record<string, any> = {}) {
    try {
      await AnalyticsEvent.create({
        userId,
        inboxId,
        eventType,
        metadata,
      })
    } catch (error) {
      logger.error({ err: error, userId, eventType }, 'Failed to record analytics event')
    }
  },

  async incrementDailyStat(userId: string, inboxId: string | null, field: keyof DailyStats, value = 1) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    try {
      await AnalyticsDaily.findOneAndUpdate(
        { userId, inboxId, date: today },
        { $inc: { [field]: value } },
        { upsert: true }
      ).exec()
    } catch (error) {
      logger.error({ err: error, userId, field }, 'Failed to increment daily stat')
    }
  },

  async getDailyStats(userId: string, query: any) {
    const filter: any = { userId }
    if (query.inboxId) filter.inboxId = query.inboxId
    if (query.startDate || query.endDate) {
      filter.date = {}
      if (query.startDate) filter.date.$gte = new Date(query.startDate)
      if (query.endDate) filter.date.$lte = new Date(query.endDate)
    }

    const [stats, total] = await Promise.all([
      AnalyticsDaily.find(filter)
        .sort({ date: -1 })
        .skip(query.offset)
        .limit(query.limit)
        .exec(),
      AnalyticsDaily.countDocuments(filter),
    ])

    return { stats, total }
  },

  async getAggregatedStats(userId: string, query: any) {
    const filter: any = { userId }
    if (query.inboxId) filter.inboxId = query.inboxId
    if (query.startDate || query.endDate) {
      filter.date = {}
      if (query.startDate) filter.date.$gte = new Date(query.startDate)
      if (query.endDate) filter.date.$lte = new Date(query.endDate)
    }

    const groupBy = query.groupBy || 'day'
    const dateFormat = groupBy === 'day' ? '%Y-%m-%d' : groupBy === 'week' ? '%Y-%U' : '%Y-%m'

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$date' } },
          emailsReceived: { $sum: '$emailsReceived' },
          emailsRead: { $sum: '$emailsRead' },
          emailsDeleted: { $sum: '$emailsDeleted' },
          otpCodesExtracted: { $sum: '$otpCodesExtracted' },
          attachmentsReceived: { $sum: '$attachmentsReceived' },
          totalAttachmentSize: { $sum: '$totalAttachmentSize' },
          aiProcessed: { $sum: '$aiProcessed' },
          aiTokensUsed: { $sum: '$aiTokensUsed' },
          webhooksDelivered: { $sum: '$webhooksDelivered' },
          webhooksFailed: { $sum: '$webhooksFailed' },
        },
      },
      { $sort: { _id: -1 as const } },
      { $skip: query.offset || 0 },
      { $limit: query.limit || 100 },
    ]

    const stats = await AnalyticsDaily.aggregate(pipeline).exec()
    return { stats }
  },

  async getEvents(userId: string, query: any) {
    const filter: any = { userId }
    if (query.inboxId) filter.inboxId = query.inboxId
    if (query.eventType) filter.eventType = query.eventType
    if (query.startDate || query.endDate) {
      filter.createdAt = {}
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate)
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate)
    }

    const [events, total] = await Promise.all([
      AnalyticsEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.offset)
        .limit(query.limit)
        .exec(),
      AnalyticsEvent.countDocuments(filter),
    ])

    return { events, total }
  },

  async getSummary(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const filter = { userId, date: { $gte: since } }

    const stats = await AnalyticsDaily.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          emailsReceived: { $sum: '$emailsReceived' },
          emailsRead: { $sum: '$emailsRead' },
          emailsDeleted: { $sum: '$emailsDeleted' },
          otpCodesExtracted: { $sum: '$otpCodesExtracted' },
          attachmentsReceived: { $sum: '$attachmentsReceived' },
          totalAttachmentSize: { $sum: '$totalAttachmentSize' },
          aiProcessed: { $sum: '$aiProcessed' },
          aiTokensUsed: { $sum: '$aiTokensUsed' },
          webhooksDelivered: { $sum: '$webhooksDelivered' },
          webhooksFailed: { $sum: '$webhooksFailed' },
        },
      },
    ]).exec()

    return stats[0] || {
      emailsReceived: 0,
      emailsRead: 0,
      emailsDeleted: 0,
      otpCodesExtracted: 0,
      attachmentsReceived: 0,
      totalAttachmentSize: 0,
      aiProcessed: 0,
      aiTokensUsed: 0,
      webhooksDelivered: 0,
      webhooksFailed: 0,
    }
  },
}