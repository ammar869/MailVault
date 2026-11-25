import { z } from 'zod'

export const createAliasSchema = z.object({
  body: z.object({
    localPart: z.string().min(1).max(64).regex(/^[a-zA-Z0-9._-]+$/),
    domain: z.string().min(1).max(255),
    targetInboxId: z.string().min(1),
    expiresAt: z.string().datetime().optional(),
    isActive: z.boolean().optional(),
  }),
})

export const updateAliasSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    targetInboxId: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  }),
})

export const aliasIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
})

export const listAliasesSchema = z.object({
  query: z.object({
    isActive: z.coerce.boolean().optional(),
    targetInboxId: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  }),
})

export type CreateAliasInput = z.infer<typeof createAliasSchema>['body']
export type UpdateAliasInput = z.infer<typeof updateAliasSchema>['body']
export type AliasIdParams = z.infer<typeof aliasIdSchema>['params']
export type ListAliasesQuery = z.infer<typeof listAliasesSchema>['query']