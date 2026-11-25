import { z } from 'zod'

export const aiResultSchema = z.object({
  summary: z.string().nullable(),
  category: z.string().nullable(),
  subCategory: z.string().nullable(),
  links: z.array(z.string().url()),
  phishingScore: z.number().min(0).max(100).nullable(),
  phishingReasons: z.array(z.string()),
  tokensUsed: z.number().int().min(0),
})

export type AIResultOutput = z.infer<typeof aiResultSchema>

export const processEmailAISchema = z.object({
  body: z.object({
    emailId: z.string().min(1),
  }),
})

export const aiToggleSchema = z.object({
  params: z.object({
    inboxId: z.string().min(1),
  }),
  body: z.object({
    enabled: z.boolean(),
  }),
})

export type ProcessEmailAIInput = z.infer<typeof processEmailAISchema>['body']
export type AIToggleInput = z.infer<typeof aiToggleSchema>['body']