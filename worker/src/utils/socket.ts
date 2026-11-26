import { logger } from '@mailvault/shared'
import { env } from '../config/env.js'

const ioredis = await import('ioredis')
const RedisClient = ioredis.default || ioredis
const publisher = new (RedisClient as any)(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true })

export async function publishRealtimeEvent(inboxId: string, event: string, payload: unknown): Promise<void> {
  try {
    if (publisher.status === 'wait') await publisher.connect()
    await publisher.publish('mailvault:socket-events', JSON.stringify({ inboxId, event, payload }))
  } catch (error) {
    logger.error({ err: error, inboxId, event }, 'Could not publish realtime email event')
  }
}
