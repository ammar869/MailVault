# MailVault — System Architecture

## 1. Overview

MailVault is a modular monolith deployed as three independently schedulable processes sharing a single codebase and data layer:

- **Web (server)** — Express API: authentication, inbox/alias/email management, developer API, webhook ingestion.
- **Worker (worker)** — BullMQ consumers: email parsing, AI summarization/categorization, phishing/link analysis, expiration cleanup, webhook delivery.
- **Client (client)** — React + Vite SPA: email viewer, inbox/alias settings, API key management.

Shared infra: MongoDB (source of truth), Redis (cache + BullMQ), Amazon S3 (attachments), Socket.IO (real-time pushes), and an external inbound email provider (AWS SES / Mailgun / equivalent) that accepts SMTP and forwards messages to MailVault via webhook.

**Constraint:** Domain registration does NOT imply email reception. An inbound email provider with MX record support and webhook forwarding must be provisioned and verified before any inbound flow works.

## 2. Components and Responsibilities

| Component | Responsibility |
|---|---|
| Client (React/Vite) | UI: inbox list, email viewer (HTML/text), attachments, alias management, expiration settings, API keys, settings. |
| Load Balancer / Edge (Nginx or cloud LB) | TLS termination, request routing (server vs worker not exposed), rate limiting at edge, static asset serving for client build. |
| API Server (Express) | REST API, JWT auth middleware, Zod validation, controller → service → repository, webhook inbound endpoints, Swagger docs. |
| Auth Service | Register/login, password hashing (bcrypt), JWT access + refresh token issuance/rotation, session invalidation. |
| Inbound Email Handler | Verifies provider webhook signatures, extracts envelope fields, enqueues `parseEmail` job, returns 200 quickly to provider. |
| Email Parser Worker (BullMQ + mailparser) | Parses raw MIME into structured fields (headers, from/to/cc/bcc, subject, text/html body, attachments), normalizes addresses, stores attachments to S3, extracts OTPs and candidate links. |
| AI Worker | Summarization, categorization, phishing/suspicious-link scoring via LLM API; writes results back to email document. |
| Background Worker (BullMQ) | Inbox/expiration cleanup, permanent purge, analytics aggregation, outgoing webhook delivery with retries. |
| Socket.IO Server | Pushes new-email notifications, read-state changes, and OTP alerts to authenticated browser clients in real time. |
| Redis | BullMQ queues/jobs, rate-limit counters, short-lived nonce/idempotency keys, pub/sub for Socket.IO adapter. |
| MongoDB | Users, inboxes, emails, aliases, attachments metadata, API keys, webhook endpoints/deliveries, audit logs. |
| Amazon S3 | Attachment blob storage (private buckets, presigned URLs for download). |
| Inbound Email Provider | Receives SMTP on customer domains, forwards to MailVault webhook (SES SNS / Mailgun webhook / equivalent). |
| DNS (customer-managed) | MX, SPF, DKIM, DMARC records pointing to the chosen inbound provider. MailVault does not host DNS. |

## 3. Data Flow

### Inbound email (critical path)

1. External sender → SMTP → Inbound Email Provider (MX for `*.mailvault.example` or customer domain).
2. Provider accepts message, enqueues internally, POSTs webhook to `POST /webhooks/inbound/:provider` with raw MIME + metadata.
3. API server verifies webhook signature (HMAC secret per provider), maps recipient to an inbox/alias, enqueues BullMQ job `parseEmail` with message id and raw payload reference.
4. API returns `202` to provider immediately (acknowledges receipt).
5. Worker picks up `parseEmail`, runs mailparser, writes email document + attachments to MongoDB/S3.
6. Worker emits Socket.IO event `email.new` to the inbox owner's connected client session.
7. Client receives event, fetches email summary or full email via REST, updates UI.

### Client request lifecycle (outbound/action)

1. Browser → HTTPS → LB → Express API.
2. Middleware chain: CORS → helmet → compression → rate limit → **auth (JWT)** → **Zod validation** → controller.
3. Controller validates ownership (inbox/alias belongs to `userId`) → service → MongoDB.
4. Response: standardized envelope `{ data, meta?, error? }`.
5. For state changes that should push to other clients, service publishes Socket.IO event via Redis adapter.

### Attachment download

1. Client requests `GET /emails/:emailId/attachments/:attachmentId/url`.
2. API verifies ownership, generates short-lived S3 presigned URL (TTL e.g. 5 min).
3. Client downloads directly from S3; MailVault never streams attachment bytes through the API.

## 4. Security Boundaries

- **Public internet → Edge:** TLS 1.2+, WAF/rate limiting, blocked request sizes.
- **Edge → API:** authenticated routes require JWT; public routes (auth, webhooks) rate-limited separately.
- **API → MongoDB/Redis/S3:** service-to-service only, no direct client access; credentials in env/secrets.
- **API → Inbound Provider:** webhook signature verification (do not trust `X-Forwarded-For` or source IP alone).
- **Client → S3:** presigned URLs only, short TTL, no public bucket policy.
- **Worker → LLM:** API key in worker env only; no PII in prompts beyond email content the user owns; opt-in per inbox.

## 5. Background Jobs and Real-Time Updates

BullMQ queues (Redis):

| Queue | Jobs | Concurrency |
|---|---|---|
| `email-parsing` | `parseEmail`, `reparseEmail` | high |
| `ai` | `summarizeEmail`, `categorizeEmail`, `scanLinks` | medium (LLM rate-limited) |
| `cleanup` | `expireInbox`, `purgeEmail`, `deleteAttachments` | low |
| `webhook-delivery` | `deliverWebhook` | medium (retry + backoff) |
| `analytics` | `aggregateAnalytics` | low |

Real-time: Socket.IO with Redis IO adapter; rooms per `userId` and per `inboxId`. Events: `email.new`, `email.read`, `email.deleted`, `otp.extracted`, `inbox.expired`.

## 6. Failure Points

- Inbound provider webhook outage or latency → email ingestion stalls (mitigate: provider retries, webhook idempotency, alert on webhook lag).
- Parser failure on malformed MIME → `reparseEmail` dead-letter, email kept as raw.
- LLM rate limit / cost → AI job fails gracefully, email remains usable without summary.
- S3 outage → attachment upload/download fails; email metadata still readable.
- Redis/MongoDB outage → API and worker degrade; circuit breakers + monitoring.
- Expiration job failure → orphaned inboxes/emails (mitigate: TTL indexes as safety net, idempotent cleanup, monitoring).

## 7. Decisions Requiring Verification

- Which inbound provider (SES vs Mailgun vs alternative) supports customer-domain MX + webhook forwarding in target regions; confirm pricing and payload limits.
- Provider webhook signature algorithm and header names (do not assume).
- Whether SES can receive inbound email in the target AWS region (SES receiving is region-limited).
- DNS MX/SPF/DKIM setup is owned by the customer; MailVault only validates records exist.

## 8. Assumptions

- One modular monolith repo; server and worker are separate npm packages/processes, not separate repos.
- JWT access tokens are short-lived; refresh tokens rotated and stored hashed.
- Temporary inboxes are inherently public (anyone knowing the address can send); no expectation of confidentiality for temp inbox contents.
- Attachments scanned for viruses/malware before being made downloadable (ClamAV or provider scan) — verification required.
