import { z } from 'zod'

export const createInboxSchema = z.object({
  body: z.object({
    type: z.enum(['temporary', 'disposable', 'alias']).default('temporary'),
    ttlHours: z.coerce.number().int().min(1).max(24 * 30).optional(),
    expiresAt: z.string().datetime().optional(),
    displayName: z.string().max(100).optional(),
    maxMessages: z.coerce.number().int().min(1).max(1000).optional(),
    aiEnabled: z.boolean().optional(),
    settings: z.record(z.any()).optional(),
  }),
})

export const updateInboxSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    displayName: z.string().max(100).optional(),
    maxMessages: z.coerce.number().int().min(1).max(1000).optional(),
    aiEnabled: z.boolean().optional(),
    settings: z.record(z.any()).optional(),
    isActive: z.boolean().optional(),
  }),
})

export const inboxIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
})

export const listInboxesSchema = z.object({
  query: z.object({
    type: z.enum(['temporary', 'disposable', 'alias']).optional(),
    isActive: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  }),
})

export type CreateInboxInput = z.infer<typeof createInboxSchema>['body']
export type UpdateInboxInput = z.infer<typeof updateInboxSchema>['body']
export type InboxIdParams = z.infer<typeof inboxIdSchema>['params']
export type ListInboxesQuery = z.infer<typeof listInboxesSchema>['query']