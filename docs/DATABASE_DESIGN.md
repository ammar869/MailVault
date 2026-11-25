# MailVault — Database Design

## 1. Data Placement

| Store | Holds | Rationale |
|---|---|---|
| MongoDB | Users, inboxes, emails, aliases, attachments metadata, API keys, webhook endpoints/deliveries, audit logs, rate-limit counters (optional overflow) | Structured, relational, queryable, durable |
| Redis | BullMQ queues/jobs, rate-limit counters (hot), Socket.IO pub/sub, short-lived idempotency/nonce keys, session blacklist | Fast, ephemeral, TTL-native |
| Amazon S3 | Email attachments (blob), optional raw MIME for large emails | Object storage, not suitable for metadata querying |

Email `textBody`/`htmlBody` stay in MongoDB for MVP simplicity; only attachments go to S3.

## 2. Collections and Schemas

### users
```json
{
  "_id": ObjectId,
  "email": "string (unique, lowercase)",
  "passwordHash": "string",
  "emailVerified": boolean (default false),
  "role": "string (owner|admin)",
  "plan": "string (free|pro)",
  "createdAt": Date,
  "updatedAt": Date
}
```

### inboxes (temporary or disposable)
```json
{
  "_id": ObjectId,
  "userId": ObjectId (ref users),
  "address": "string (unique, lowercase)",
  "domain": "string",
  "type": "string (temporary|disposable|alias)",
  "displayName": "string",
  "expiresAt": Date (TTL index),
  "isActive": boolean (default true),
  "maxMessages": number,
  "messageCount": number,
  "aiEnabled": boolean (default false),
  "settings": object,
  "createdAt": Date,
  "updatedAt": Date
}
```

### emails
```json
{
  "_id": ObjectId,
  "inboxId": ObjectId (ref inboxes),
  "messageId": "string (provider message-id, unique per inbox)",
  "from": { "name": string, "address": string },
  "to": [{ "name", "address" }],
  "cc": [{ "name", "address" }],
  "bcc": [{ "name", "address" }],
  "subject": "string",
  "textBody": "string",
  "htmlBody": "string",
  "receivedAt": Date,
  "parsedAt": Date,
  "size": number,
  "status": "string (new|read|archived|deleted)",
  "readAt": Date,
  "attachments": [{ "attachmentId": ObjectId, "filename", "mimeType", "size", "s3Key" }],
  "aiSummary": "string",
  "aiCategory": "string",
  "riskScore": "number (0-100)",
  "riskFlags": ["string"],
  "otpCodes": ["string"],
  "createdAt": Date
}
```

### attachments
```json
{
  "_id": ObjectId,
  "emailId": ObjectId (ref emails),
  "filename": "string",
  "mimeType": "string",
  "size": number,
  "s3Key": "string",
  "s3Bucket": "string",
  "virusScanStatus": "string (pending|clean|infected)",
  "createdAt": Date
}
```

### aliases (personal/business privacy forwarding)
```json
{
  "_id": ObjectId,
  "userId": ObjectId (ref users),
  "address": "string (unique, lowercase)",
  "targetInboxId": ObjectId (ref inboxes),
  "isActive": boolean (default true),
  "expiresAt": Date (TTL optional),
  "usageCount": number,
  "createdAt": Date,
  "updatedAt": Date
}
```

### otpRecords
```json
{
  "_id": ObjectId,
  "emailId": ObjectId (ref emails),
  "code": "string",
  "extractedAt": Date,
  "expiresAt": Date (TTL index),
  "usedAt": Date,
  "usedBy": ObjectId (ref users)
}
```

### apiKeys (developer API)
```json
{
  "_id": ObjectId,
  "userId": ObjectId (ref users),
  "name": "string",
  "keyHash": "string (unique)",
  "keyPrefix": "string (first 8 chars)",
  "scopes": ["string"],
  "lastUsedAt": Date,
  "expiresAt": Date,
  "createdAt": Date
}
```

### webhookEndpoints (developer outgoing webhooks)
```json
{
  "_id": ObjectId,
  "userId": ObjectId (ref users),
  "url": "string (https only)",
  "events": ["string"],
  "secret": "string (HMAC signing secret)",
  "isActive": boolean (default true),
  "createdAt": Date,
  "updatedAt": Date
}
```

### webhookDeliveries
```json
{
  "_id": ObjectId,
  "webhookId": ObjectId (ref webhookEndpoints),
  "event": "string",
  "payloadId": "string (idempotency key)",
  "status": "string (pending|sent|failed|dead)",
  "attempts": number,
  "nextRetry": Date,
  "lastResponse": { "statusCode", "body" },
  "createdAt": Date,
  "updatedAt": Date
}
```

### auditLogs
```json
{
  "_id": ObjectId,
  "userId": ObjectId (ref users, optional for system),
  "action": "string",
  "resourceType": "string",
  "resourceId": ObjectId,
  "metadata": object,
  "ip": "string",
  "createdAt": Date
}
```

## 3. Indexes

- `users.email` — unique
- `inboxes.userId`, `inboxes.expiresAt` (TTL), `inboxes.address` (unique), `inboxes.isActive`
- `emails.inboxId`, `emails.receivedAt` (-1), `emails.messageId` (unique per inbox via partial/compound), `emails.status`, `emails.aiCategory`
- `attachments.emailId`, `attachments.s3Key` (unique)
- `aliases.userId`, `aliases.address` (unique), `aliases.targetInboxId`, `aliases.expiresAt` (TTL optional)
- `otpRecords.emailId`, `otpRecords.expiresAt` (TTL)
- `apiKeys.keyHash` (unique), `apiKeys.userId`
- `webhookDeliveries.webhookId`, `webhookDeliveries.nextRetry`
- `auditLogs.userId`, `auditLogs.createdAt` (-1)

## 4. Expiration and Retention Strategies

- **TTL indexes** on `inboxes.expiresAt`, `otpRecords.expiresAt`, optional `aliases.expiresAt`: MongoDB auto-removes expired documents.
- **Email retention:** soft-delete (`status=deleted`) immediately; permanent purge after configurable retention (e.g., 30 days free, 90 days pro) via `cleanup` queue job; TTL index as safety net on a `purgeAt` field.
- **Attachments:** deleted when owning email is purged; orphaned attachment cleanup job runs daily.
- **Audit logs:** retained 90 days (configurable), then purged.
- **Webhook deliveries:** purge after 7 days.

## 5. Relationships

- `users` 1:N `inboxes` (owned inboxes)
- `users` 1:N `aliases`
- `inboxes` 1:N `emails`
- `emails` 1:N `attachments`
- `emails` 1:N `otpRecords`
- `users` 1:N `apiKeys`, `webhookEndpoints`
- `webhookEndpoints` 1:N `webhookDeliveries`

Ownership enforcement happens at the API service layer (every request filters by `userId`).

## 6. What Never Goes in MongoDB

- Secrets/JWT signing keys (env/secrets manager)
- Raw attachment blobs (S3)
- Long-lived webhook payloads (Redis for in-flight only)
