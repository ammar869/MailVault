# MailVault — Technical Decisions

## 1. Adopted Decisions

| Decision | Rationale |
|---|---|
| Modular monolith (single repo, server + worker processes) | Simpler ops, shared types/models, clear MVP path; can split later. |
| Express.js backend | Team familiarity, middleware ecosystem, matches stack. |
| MongoDB + Mongoose | Flexible schema for email headers/attachments, TTL indexes for expiration. |
| Redis + BullMQ | Reliable queues, retries, delayed jobs; also cache and Socket.IO adapter. |
| Socket.IO | Real-time new-email/OTP push with room-based scoping and Redis adapter. |
| mailparser | Mature MIME parsing; avoids hand-rolling RFC parsing. |
| Amazon S3 for attachments | Object storage, presigned URLs, decouples blobs from DB. |
| JWT (access + refresh) | Stateless auth, simple revocation via refresh rotation. |
| Zod validation | Type-safe schema validation shared across routes. |
| Swagger/OpenAPI | Auto-generated docs, developer-facing contract. |
| Docker Compose locally | One-command dev environment parity. |
| Client: React + Vite + Tailwind + shadcn | Rapid UI, consistent components. |
| Tests: Vitest/Jest + Supertest | Matches Node ecosystem; Supertest for HTTP assertions. |

## 2. Explicitly Rejected (for MVP)

- Microservices: adds operational complexity before product-market fit.
- Separate repos for server/worker: version drift risk; shared types harder.
- Storing raw MIME or attachments in MongoDB: size limits, backup cost; S3 for blobs.
- In-house SMTP server: deliverability/reputation complexity; use provider.
- WebSockets raw: Socket.IO provides rooms, reconnection, adapters.
- GraphQL: REST is simpler for this resource model; OpenAPI sufficient.

## 3. Decisions Requiring Verification

- Inbound email provider: AWS SES vs Mailgun vs alternative. Verify:
  - Customer-domain MX + webhook forwarding support.
  - Inbound availability in target region (SES receiving is region-limited).
  - Webhook signature header/algorithm and payload format.
  - Pricing at expected volume.
- DNS: MX/SPF/DKIM/DMARC owned by customer; MailVault documents required records, never invents them.
- Virus scanning: ClamAV self-hosted vs provider scan vs deferred for MVP.
- LLM provider/model selection and cost ceiling per user/month.
- Redis BullMQ with managed Redis (cluster mode, ACLs).
- MinIO → Amazon S3 parity for presigned URL generation and CORS.

## 4. Assumptions

- Temporary inbox contents are not confidential; address is public.
- Personal/business aliases are the private communication path.
- JWT access tokens short-lived; refresh tokens rotated.
- Email body text and HTML stored in MongoDB; only attachments in S3.
- No multi-tenant data isolation beyond `userId` ownership at MVP.
- Provider webhook retries on non-2xx; MailVault idempotent by message-id.

## 5. Unresolved Questions

- Which inbound provider and region? (blocks Phase 2)
- Exact webhook signature verification implementation per provider.
- Virus scan requirement for MVP or post-MVP?
- AI cost cap and free-tier limits?
- Custom domain support for aliases at MVP or later?
- Retention period per plan (free vs paid)?
- S3 region and bucket naming?

## 6. Change Log

- v1.0 — Initial architecture blueprint (no implementation).
