import { z } from 'zod'

const webhookEventTypes = ['email.new', 'email.read', 'email.deleted', 'otp.extracted', 'inbox.expired', 'inbox.created', 'alias.created'] as const

export const createWebhookSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    url: z.string().url(),
    events: z.array(z.enum(webhookEventTypes)).min(1),
    maxRetries: z.coerce.number().int().min(0).max(10).optional(),
    backoffSchedule: z.array(z.coerce.number().int().positive()).optional(),
    headers: z.record(z.string()).optional(),
  }),
})

export const updateWebhookSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    url: z.string().url().optional(),
    events: z.array(z.enum(webhookEventTypes)).optional(),
    maxRetries: z.coerce.number().int().min(0).max(10).optional(),
    backoffSchedule: z.array(z.coerce.number().int().positive()).optional(),
    headers: z.record(z.string()).optional(),
    isActive: z.boolean().optional(),
  }),
})

export const webhookIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
})

export const listWebhooksSchema = z.object({
  query: z.object({
    isActive: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  }),
})

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>['body']
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>['body']
export type WebhookIdParams = z.infer<typeof webhookIdSchema>['params']
export type ListWebhooksQuery = z.infer<typeof listWebhooksSchema>['query']