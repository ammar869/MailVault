declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(config: any)
    send(command: any): Promise<any>
    destroy(): void
  }

  export class S3 extends S3Client {}

  export class PutObjectCommand {
    constructor(input: { Bucket: string; Key: string; Body: any; ContentType?: string })
    input: { Bucket: string; Key: string; Body: any; ContentType?: string }
  }

  export class GetObjectCommand {
    constructor(input: { Bucket: string; Key: string })
    input: { Bucket: string; Key: string }
  }

  export class DeleteObjectCommand {
    constructor(input: { Bucket: string; Key: string })
    input: { Bucket: string; Key: string }
  }

  export class DeleteObjectsCommand {
    constructor(input: { Bucket: string; Delete: { Objects: Array<{ Key: string }>; Quiet?: boolean } })
    input: { Bucket: string; Delete: { Objects: Array<{ Key: string }>; Quiet?: boolean } }
  }

  export class ListObjectsV2Command {
    constructor(input: any)
    input: any
  }

  export class HeadObjectCommand {
    constructor(input: { Bucket: string; Key: string })
    input: { Bucket: string; Key: string }
  }

  export class CopyObjectCommand {
    constructor(input: any)
    input: any
  }

  export * from './commands'
}