import { z } from 'zod'

// Provider payload shapes are validated by their signature-aware handlers.
export const sesWebhookSchema = z.object({ body: z.record(z.unknown()) })

export const mailgunWebhookSchema = z.object({
  body: z.object({
    signature: z.string().optional(),
    timestamp: z.string().optional(),
    token: z.string().optional(),
    'X-Envelope-From': z.string().optional(),
    'X-Envelope-To': z.string().optional(),
    recipient: z.string().optional(),
    sender: z.string().optional(),
    from: z.string().optional(),
    From: z.string().optional(),
    To: z.string().optional(),
    'Message-Id': z.string().optional(),
    'body-plain': z.string().optional(),
    'body-html': z.string().optional(),
    'body-mime': z.string().optional(),
  }).passthrough(),
})

export type SesWebhookInput = z.infer<typeof sesWebhookSchema>['body']
export type MailgunWebhookInput = z.infer<typeof mailgunWebhookSchema>['body']
