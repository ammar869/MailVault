import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { env } from '../config/env.js'
import { logger } from './logger.js'
import { verifyAccessToken } from '../modules/auth/auth.service.js'
import { Inbox } from '../modules/inboxes/inbox.model.js'
import mongoose from 'mongoose'

let io: Server | null = null
let pubClient: any = null
let subClient: any = null
let eventsSubClient: any = null

interface AuthenticatedSocket extends Socket {
  userId?: string
}

async function createRedisClients() {
  const ioredis = await import('ioredis')
  const RedisClient = ioredis.default || ioredis
  pubClient = new (RedisClient as any)(env.REDIS_URL, { maxRetriesPerRequest: null })
  subClient = new (RedisClient as any)(env.REDIS_URL, { maxRetriesPerRequest: null })
}

export async function initSocket(httpServer: HttpServer): Promise<Server> {
  await createRedisClients()

  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    },
  })

  io.adapter(createAdapter(pubClient, subClient))

  eventsSubClient = pubClient.duplicate()
  await eventsSubClient.subscribe('mailvault:socket-events')
  eventsSubClient.on('message', (_channel: string, message: string) => {
    try {
      const event = JSON.parse(message)
      if (typeof event.inboxId === 'string' && typeof event.event === 'string') {
        io?.to(`inbox:${event.inboxId}`).emit(event.event, event.payload)
      }
    } catch (error) {
      logger.warn({ err: error }, 'Ignored malformed realtime event')
    }
  })

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
      if (!token) {
        return next(new Error('Authentication required'))
      }
      const payload = await verifyAccessToken(token)
      if (payload.type !== 'access') {
        return next(new Error('Invalid token type'))
      }
      socket.userId = payload.userId
      next()
    } catch (error) {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info({ userId: socket.userId, socketId: socket.id }, 'Socket connected')

    socket.join(`user:${socket.userId}`)

    socket.on('join:inbox', async (inboxId: string) => {
      if (typeof inboxId !== 'string' || !mongoose.isValidObjectId(inboxId)) return
      const ownsInbox = await Inbox.exists({ _id: inboxId, userId: socket.userId, isActive: true, expiresAt: { $gt: new Date() } })
      if (!ownsInbox) {
        socket.emit('error', { code: 'INBOX_NOT_FOUND' })
        return
      }
      await socket.join(`inbox:${inboxId}`)
      logger.debug({ userId: socket.userId, inboxId }, 'Joined inbox room')
    })

    socket.on('leave:inbox', (inboxId: string) => {
      socket.leave(`inbox:${inboxId}`)
      logger.debug({ userId: socket.userId, inboxId }, 'Left inbox room')
    })

    socket.on('join:user', () => socket.join(`user:${socket.userId}`))
    socket.on('leave:user', () => socket.leave(`user:${socket.userId}`))

    socket.on('disconnect', (reason) => {
      logger.info({ userId: socket.userId, socketId: socket.id, reason }, 'Socket disconnected')
    })
  })

  return io
}

export function getIO(): Server | null {
  return io
}

export function emitEmailNew(inboxId: string, email: any): void {
  if (!io) return
  io.to(`inbox:${inboxId}`).emit('email.new', email)
}

export function emitEmailRead(inboxId: string, emailId: string): void {
  if (!io) return
  io.to(`inbox:${inboxId}`).emit('email.read', { emailId })
}

export function emitEmailDeleted(inboxId: string, emailId: string): void {
  if (!io) return
  io.to(`inbox:${inboxId}`).emit('email.deleted', { emailId })
}

export function emitOtpExtracted(inboxId: string, otp: string): void {
  if (!io) return
  io.to(`inbox:${inboxId}`).emit('otp.extracted', { otp })
}

export function emitInboxExpired(inboxId: string): void {
  if (!io) return
  io.to(`inbox:${inboxId}`).emit('inbox.expired', { inboxId })
}
