import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { env } from '../config/env.js'
import { logger } from './logger.js'
import { verifyAccessToken } from '../modules/auth/auth.service.js'

let io: Server | null = null
let pubClient: any = null
let subClient: any = null

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

    socket.on('join-inbox', (inboxId: string) => {
      socket.join(`inbox:${inboxId}`)
      logger.debug({ userId: socket.userId, inboxId }, 'Joined inbox room')
    })

    socket.on('leave-inbox', (inboxId: string) => {
      socket.leave(`inbox:${inboxId}`)
      logger.debug({ userId: socket.userId, inboxId }, 'Left inbox room')
    })

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