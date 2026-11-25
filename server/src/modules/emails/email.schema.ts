import { z } from 'zod'

export const listEmailsSchema = z.object({
  query: z.object({
    inboxId: z.string().min(1).optional(),
    status: z.enum(['new', 'read', 'archived', 'deleted']).optional(),
    from: z.string().optional(),
    subject: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    sort: z.enum(['receivedAt', 'subject', 'from']).default('receivedAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),
})

export const emailIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
})

export const updateEmailSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.enum(['new', 'read', 'archived', 'deleted']).optional(),
  }),
})

export const attachmentIdSchema = z.object({
  params: z.object({
    emailId: z.string().min(1),
    attachmentId: z.string().min(1),
  }),
})

export type ListEmailsQuery = z.infer<typeof listEmailsSchema>['query']
export type EmailIdParams = z.infer<typeof emailIdSchema>['params']
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>['body']
export type AttachmentIdParams = z.infer<typeof attachmentIdSchema>['params']