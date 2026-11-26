import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().url().default('mongodb://localhost:27017/mailvault'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  S3_BUCKET: z.string().default('mailvault-dev'),
  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin'),
  S3_REGION: z.string().default('us-east-1'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('gpt-4o-mini'),
  AI_MONTHLY_TOKEN_LIMIT: z.coerce.number().default(1000000),
  WEBHOOK_SECRET_SES: z.string().optional(),
  SES_SNS_TOPIC_ARN: z.string().optional(),
  WEBHOOK_SECRET_MAILGUN: z.string().optional(),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
})

export const env = envSchema.parse(process.env)
