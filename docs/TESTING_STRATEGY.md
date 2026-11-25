# MailVault — Testing Strategy

## 1. Test Pyramid

Unit → Integration → API → E2E, with security and load layered on top.

Tools: Vitest or Jest (unit/integration/API), Supertest (API), Playwright or Cypress (E2E), k6 or Artillery (load), MongoDB Memory Server or testcontainers (integration DB), Redis mock/testcontainers.

## 2. Unit Tests

Scope: pure functions, services, job handlers, schemas, utils with mocked DB/external services.

Scenarios & expected results:
- Zod schema rejects invalid email/inbox payload → 400-shaped validation error.
- JWT sign/verify: valid token returns payload; expired or tampered token throws.
- mailparser field mapping: raw MIME → normalized from/to/subject/body; missing subject defaults to empty string.
- OTP regex: extracts 6-digit code from "Your code is 123456"; returns null when absent.
- Risk scoring: known phishing link domain → score ≥ threshold; clean link → low score.
- S3 presigned URL generation: returns URL with expiry query param; invalid key throws.

Expected: all pass; coverage ≥ 80% on services/utils.

## 3. Integration Tests

Scope: service + repository + queue with real/in-memory MongoDB and Redis; external providers mocked.

Scenarios & expected results:
- `parseEmail` job stores email doc in MongoDB + attachment in S3 (mock), returns email id.
- Duplicate inbound webhook (same message-id) → second is idempotent, no duplicate email doc.
- Cleanup job: expired inbox → inbox `isActive=false`, emails soft-deleted.
- AI job with mocked LLM → summary/category written to email doc; LLM error → email still stored, no summary.
- Webhook delivery retry: first attempt fails 500, second succeeds → status sent; max attempts → dead.

Expected: DB state matches assertions; side effects (S3 mock, queue) correct.

## 4. API Tests (Supertest)

Scope: full Express router with auth middleware, Zod validation, error handler.

Scenarios & expected results:
- `POST /auth/register` valid → 201, user created, password not returned.
- `POST /auth/register` duplicate email → 409.
- `POST /auth/login` wrong password → 401.
- `GET /emails` no token → 401.
- `GET /emails/:id` another user's email → 403.
- `POST /inboxes` valid → 201; `ttlHours` negative → 400.
- `GET /emails/:id/attachments/:id/url` → 200 with presigned URL.
- `POST /webhooks/inbound/ses` invalid signature → 401.
- Webhook envelope shape: success `{data, meta?}`, error `{error:{code,message}}`.

Expected: status codes and body shapes match spec.

## 5. End-to-End Tests (Playwright/Cypress)

Scope: browser against running stack.

Scenarios & expected results:
- Register → login → create temp inbox → external send email to inbox address → inbox list shows new email → open email → subject/body match → OTP code listed.
- Create alias → send to alias → email appears in target inbox.
- Set inbox TTL short → after expiry, inbox gone from list.
- Upload/view attachment → download via presigned URL works.

Expected: critical user journey completes; UI reflects server state.

## 6. Security Tests

Scenarios & expected results:
- JWT bypass: protected endpoint without token → 401; tampered token → 401.
- IDOR: user A accesses user B's inbox/email → 403.
- Rate limit: exceed auth limit → 429.
- Webhook signature: missing/invalid → 401.
- Attachment: no public S3 access; presigned URL expires; path traversal in filename rejected.
- XSS: email HTML body rendered safely (sanitized on client) — no script execution.

Expected: no auth bypass, no IDOR, no open S3, no reflected XSS.

## 7. Load & Performance Tests (k6/Artillery)

Scenarios & expected results:
- 50 concurrent users polling `/emails` → p95 < 500ms, no 5xx.
- Burst of 100 inbound webhooks/sec → API stays healthy, queue depth stable, no dropped 200s.
- LLM summarization concurrency capped (e.g., 5 parallel) → no LLM 429 cascade.

Expected: latency and error-rate targets met; Redis/Memory stable.

## 8. Test Execution

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:api`
- `npm run test:e2e` (requires running stack)
- `npm run test:security`
- `npm run test:load`

CI runs unit+integration+api on every PR; e2e/security/load on merge or nightly.
