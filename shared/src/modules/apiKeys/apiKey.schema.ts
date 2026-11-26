import { z } from 'zod'

export const createApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    scopes: z.array(z.enum(['emails:read', 'emails:write', 'inboxes:read', 'inboxes:write', 'aliases:read', 'aliases:write', 'ai:read', 'analytics:read', 'webhooks:read', 'webhooks:write', '*'])).min(1),
    rateLimit: z.coerce.number().int().min(1).max(10000).optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  }),
})

export const updateApiKeySchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    scopes: z.array(z.enum(['emails:read', 'emails:write', 'inboxes:read', 'inboxes:write', 'aliases:read', 'aliases:write', 'ai:read', 'analytics:read', 'webhooks:read', 'webhooks:write', '*'])).optional(),
    rateLimit: z.coerce.number().int().min(1).max(10000).optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    isActive: z.boolean().optional(),
  }),
})

export const apiKeyIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
})

export const listApiKeysSchema = z.object({
  query: z.object({
    isActive: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  }),
})

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>['body']
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>['body']
export type ApiKeyIdParams = z.infer<typeof apiKeyIdSchema>['params']
export type ListApiKeysQuery = z.infer<typeof listApiKeysSchema>['query']