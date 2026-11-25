import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../config/env.js'
import { logger } from './logger.js'

const s3Client = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
})

export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
  bucket: string = env.S3_BUCKET
): Promise<void> {
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
  logger.debug({ key, bucket }, 'Uploaded to S3')
}

export async function getPresignedUrl(
  bucket: string,
  key: string,
  expiresIn: number = 300
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  return getSignedUrl(s3Client, command, { expiresIn })
}

export function generateS3Key(prefix: string, filename: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 10)
  const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : ''
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100)
  return `${prefix}/${timestamp}-${random}-${safeName}`
}

export async function ensureBucketExists(bucket: string = env.S3_BUCKET): Promise<void> {
  try {
    await s3Client.send(new PutObjectCommand({ Bucket: bucket, Key: '', Body: '' }))
  } catch (error: any) {
    if (error.name !== 'BucketAlreadyExists' && error.name !== 'BucketAlreadyOwnedByYou') {
      logger.error({ err: error, bucket }, 'Failed to ensure bucket exists')
    }
  }
}

export async function deleteFromS3(bucket: string, key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  logger.debug({ key, bucket }, 'Deleted from S3')
}