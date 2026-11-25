import { z } from 'zod'

export const sesWebhookSchema = z.object({
  body: z.object({
    Records: z.array(
      z.object({
        ses: z.object({
          mail: z.object({
            messageId: z.string(),
            timestamp: z.string(),
            source: z.string().email(),
            destination: z.array(z.string().email()),
            headersTruncated: z.boolean().optional(),
            headers: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
            commonHeaders: z.object({
              from: z.array(z.string()).optional(),
              to: z.array(z.string()).optional(),
              cc: z.array(z.string()).optional(),
              subject: z.string().optional(),
              messageId: z.string().optional(),
              date: z.string().optional(),
            }).optional(),
          }),
          receipt: z.object({
            timestamp: z.string(),
            processingTimeMillis: z.number().optional(),
            recipients: z.array(z.string().email()),
            spamVerdict: z.object({ status: z.string() }).optional(),
            virusVerdict: z.object({ status: z.string() }).optional(),
            spfVerdict: z.object({ status: z.string() }).optional(),
            dkimVerdict: z.object({ status: z.string() }).optional(),
            dmarcVerdict: z.object({ status: z.string() }).optional(),
            action: z.object({
              type: z.string(),
              bucketName: z.string().optional(),
              objectKey: z.string().optional(),
            }).optional(),
          }),
        }),
      })
    ),
  }),
})

export const mailgunWebhookSchema = z.object({
  body: z.object({
    'message-headers': z.array(z.array(z.string())).optional(),
    'Content-Type': z.string().optional(),
    'X-Envelope-From': z.string().email().optional(),
    'X-Envelope-To': z.string().email().optional(),
    'Date': z.string().optional(),
    'From': z.string().optional(),
    'To': z.string().optional(),
    'Cc': z.string().optional(),
    'Subject': z.string().optional(),
    'Message-Id': z.string().optional(),
    'body-plain': z.string().optional(),
    'body-html': z.string().optional(),
    'stripped-text': z.string().optional(),
    'stripped-html': z.string().optional(),
    'stripped-signature': z.string().optional(),
    'attachment-count': z.coerce.number().optional(),
    'attachments': z.array(z.any()).optional(),
  }),
})

export type SesWebhookInput = z.infer<typeof sesWebhookSchema>['body']
export type MailgunWebhookInput = z.infer<typeof mailgunWebhookSchema>['body']