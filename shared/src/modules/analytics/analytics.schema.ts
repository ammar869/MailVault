import { z } from 'zod'

export const analyticsQuerySchema = z.object({
  query: z.object({
    inboxId: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    groupBy: z.enum(['day', 'week', 'month']).default('day'),
    limit: z.coerce.number().int().min(1).max(1000).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  }),
})

export const analyticsEventsQuerySchema = z.object({
  query: z.object({
    inboxId: z.string().optional(),
    eventType: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(1000).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  }),
})

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>['query']
export type AnalyticsEventsQuery = z.infer<typeof analyticsEventsQuerySchema>['query']