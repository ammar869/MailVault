# MailVault — Development Phases

MVP = Phases 0–3. Advanced = Phases 4–7.

## Phase 0 — Scaffolding & Dev Environment

**Objective:** Repo structure, Docker Compose, CI lint/typecheck, shared config.

**Features:** Monorepo layout (client/server/worker), Docker Compose (MongoDB, Redis, MinIO/S3-local), env schema validation, logging, health check endpoint.

**Dependencies:** Node, Docker, Docker Compose.

**Files/modules:** `docker-compose.yml`, `Dockerfile.*`, `server/src/config/*`, root `package.json`, `tsconfig.json`.

**Deliverables:** `docker-compose up` boots all infra; `npm run lint` and `npm run typecheck` pass; `/health` returns 200.

**Acceptance criteria:** New developer can clone and run full stack locally in one command.

**Testing:** None required; smoke test `/health`.

---

## Phase 1 — Authentication & User Management

**Objective:** Secure identity foundation for all later modules.

**Features:** Register/login, password hashing, JWT access + refresh, protected routes, current-user profile, email verification (placeholder).

**Dependencies:** Phase 0, Zod, bcrypt, jsonwebtoken.

**Files/modules:** `server/src/modules/auth/*` (routes, controller, service, schema, model), middleware auth.

**Deliverables:** Authenticated API with register/login/me/refresh/logout.

**Acceptance criteria:** Unauthenticated calls to protected routes return 401; invalid credentials return 401; tokens expire/rotate correctly.

**Testing:** Unit (password hash, JWT sign/verify), API (Supertest auth flows), security (brute-force rate limit).

---

## Phase 2 — Inbound Email Infrastructure & Temporary Inboxes (MVP Core)

**Objective:** Receive real email into temp/disposable inboxes.

**Features:** Inbox creation (temp, TTL), inbound webhook endpoints (SES/Mailgun placeholder), raw message acceptance, basic inbox listing.

**Dependencies:** Phase 1, inbound provider account + domain + MX (verified outside code), webhook signature lib.

**Files/modules:** `server/src/modules/inboxes/*`, `server/src/modules/webhooks/inbound/*`, `worker/src/queues.ts`, BullMQ `email-parsing` queue stub.

**Deliverables:** `POST /webhooks/inbound/:provider` returns 200; inbox created; message recorded as raw email doc (unparsed).

**Acceptance criteria:** Provider webhook test payload stored; inbox TTL set; unauthenticated webhook without valid signature returns 401.

**Testing:** API (webhook signature valid/invalid), integration (enqueue parse job).

**Verification required:** Provider supports customer-domain MX + webhook forwarding in target region; signature algorithm/header names confirmed.

---

## Phase 3 — Email Parsing, Viewer & OTP Extraction

**Objective:** Turn raw MIME into readable email; extract OTPs.

**Features:** mailparser job worker, email document (headers/body/attachments meta), email viewer API, attachment upload to S3, OTP regex extraction, `email.new` Socket.IO push.

**Dependencies:** Phase 2, mailparser, S3 client, Socket.IO server + client socket.

**Files/modules:** `worker/src/jobs/parseEmail.ts`, `server/src/modules/emails/*`, `server/src/modules/attachments/*`, `server/src/socket.ts`, `client/src/lib/socket.ts`.

**Deliverables:** Received email viewable in client; new email pushes to browser; OTPs listed under `/otp`.

**Acceptance criteria:** Real inbound email parsed correctly; OTP code extracted; attachment stored in S3 with presigned URL; Socket.IO event received by client.

**Testing:** Unit (mailparser field mapping, OTP regex), integration (job → DB/S3), API (email CRUD, presigned URL), E2E (send email → receive → view → OTP).

---

## Phase 4 — Aliases, Expiration & Retention

**Objective:** Privacy aliases and automated lifecycle cleanup.

**Features:** Alias create/list/revoke → target inbox, inbox expiration (TTL), email soft-delete + purge, attachment cleanup, audit logs.

**Dependencies:** Phase 3, TTL indexes, cleanup queue jobs.

**Files/modules:** `server/src/modules/aliases/*`, `worker/src/jobs/cleanup/*.ts`, `server/src/modules/audit/*`.

**Deliverables:** Alias forwarding works; expired inboxes removed; purge job idempotent.

**Acceptance criteria:** Email to alias lands in target inbox; expired inbox inaccessible after TTL; purge deletes email + attachments.

**Testing:** Integration (TTL expiry), API (alias CRUD), worker (cleanup idempotency).

---

## Phase 5 — AI Summaries, Categorization & Phishing Indicators

**Objective:** LLM-powered email intelligence (opt-in).

**Features:** Summarize, categorize, link extraction, suspicious-link/phishing risk score, per-inbox AI toggle, token usage guardrails.

**Dependencies:** Phase 3, LLM API key, `ai` BullMQ queue, cost-limit config.

**Files/modules:** `worker/src/jobs/ai/*.ts`, `server/src/modules/ai/*`, `server/src/modules/emails/*` (ai fields).

**Deliverables:** Email summary/category displayed; risk flags shown; opt-in toggle respected.

**Acceptance criteria:** AI job runs on new email when enabled; summary stored; disabled inbox → no AI call; LLM failure doesn't block email delivery.

**Testing:** Unit (prompt builder, score parsing), integration (AI job with mocked LLM), API (toggle), load (LLM concurrency cap).

---

## Phase 6 — Developer API, Webhooks & Analytics

**Objective:** Programmable access and event streaming.

**Features:** API keys (scoped), outgoing webhook endpoints/deliveries with retries, webhook event types, analytics aggregation.

**Dependencies:** Phase 1, `webhook-delivery` and `analytics` queues.

**Files/modules:** `server/src/modules/api-keys/*`, `server/src/modules/webhooks/outgoing/*`, `server/src/modules/analytics/*`, `worker/src/jobs/deliverWebhook.ts`.

**Deliverables:** Third-party can fetch emails via API key; webhook delivered on `email.new`; analytics endpoint returns stats.

**Acceptance criteria:** API key auth works; webhook retry/backoff; idempotency key prevents duplicates.

**Testing:** API (key CRUD), integration (webhook delivery retry), security (key leakage in logs).

---

## Phase 7 — Real-Time Polish & Hardening

**Objective:** Production-grade MVP hardening.

**Features:** Socket.IO rooms (inbox/user), read-state sync, attachment virus scan placeholder, security headers, monitoring/alerting, load test.

**Dependencies:** All previous phases.

**Files/modules:** `server/src/socket.ts` rooms, middleware security, `infrastructure/` prod configs, `tests/load/*`.

**Deliverables:** Real-time inbox updates across tabs; security headers; load test results documented.

**Acceptance criteria:** Multi-tab real-time sync; no sensitive data in logs; load test meets target (e.g., 50 concurrent inbox polls).

**Testing:** E2E real-time, security scan, load test.
