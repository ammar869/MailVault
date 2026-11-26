import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { webhookDeliveryService } from '@mailvault/shared'
import { logger } from '../utils/logger.js'
export async function processWebhookDeliveryJob(): Promise<void> {
  await connectDB()
  const deliveries = await webhookDeliveryService.getPendingDeliveries(50)

  for (const delivery of deliveries) {
    await webhookDeliveryService.processDelivery(delivery._id.toString())
  }

  logger.info({ processed: deliveries.length }, 'Webhook delivery batch completed')
}

logger.info('Webhook delivery processor loaded')
