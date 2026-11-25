import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

let isConnected = false

export const connectDB = async (): Promise<void> => {
  if (isConnected) {
    logger.debug('MongoDB already connected')
    return
  }

  try {
    await mongoose.connect(env.MONGODB_URI)
    isConnected = true
    logger.info('MongoDB connected successfully')
  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection failed')
    throw error
  }
}

export const disconnectDB = async (): Promise<void> => {
  if (!isConnected) return
  await mongoose.disconnect()
  isConnected = false
  logger.info('MongoDB disconnected')
}

mongoose.connection.on('error', (err) => {
  logger.error({ err }, 'MongoDB connection error')
  isConnected = false
})

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected')
  isConnected = false
})

process.on('SIGINT', async () => {
  await disconnectDB()
  process.exit(0)
})