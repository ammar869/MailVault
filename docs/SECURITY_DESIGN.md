# MailVault — Security Design

## 1. Security Boundaries

| Boundary | Control |
|---|---|
| Public internet → Edge | TLS 1.2+, WAF, DDoS protection, request-size limits, security headers (CSP, HSTS, X-Content-Type-Options). |
| Edge → API | Rate limiting per IP/user; JWT required on all user routes; CORS restricted to client origin. |
| API → Internal data | Service-layer ownership checks; no direct DB/Redis/S3 access from client. |
| API → Inbound provider | Webhook signature verification; provider IP allowlist where supported; idempotency by message-id. |
| Client → S3 | Short-lived presigned URLs only; bucket private, no public read. |
| Worker → LLM | Worker-only API key; no secrets in client; prompts limited to user's own email content. |

## 2. Authentication & Authorization

- Passwords hashed with bcrypt (work factor ≥ 12).
- JWT access tokens short-lived (e.g., 15 min); refresh tokens rotated, stored hashed, single-use family.
- Every resource endpoint enforces `ownerId === auth.userId`.
- API keys scoped, hashed in DB, plaintext shown once at creation.
- Session invalidation on logout/password change.

## 3. Inbound Email Security

- Domain registration ≠ email reception; MX/SPF/DKIM/DMARC configured by customer via provider.
- Webhook source validated by signature, not IP.
- Raw MIME size capped to prevent abuse.
- Temporary inboxes are public-by-address: anyone who knows the address can send. Contents are not treated as confidential. Personal/business aliases are the private path.

## 4. Attachment Security

- Attachments stored in private S3 bucket; download via short-lived presigned URL (TTL ≤ 5 min).
- Filename sanitized (no path traversal, reserved chars stripped).
- Size and MIME-type limits enforced before upload.
- Virus/malware scan (ClamAV or provider) before marking downloadable; infected → quarantine, never serve.
- No executable MIME types served inline where avoidable; `Content-Disposition: attachment`.

## 5. Data Leakage Prevention

- No secrets, keys, or PII in logs; mask `Authorization`, `Cookie`, `X-API-Key`.
- AI prompts include only the target user's email; no cross-user data; opt-in per inbox.
- Error messages generic to client; detailed errors server-side only (request-id correlation).
- Audit log for sensitive actions (inbox delete, alias create, key create, export).

## 6. Abuse & Spam

- Per-user inbox/alias/message limits by plan.
- Rate limit inbound webhooks per provider/IP.
- Reputation/risk scoring on links; flag suspicious.
- CAPTCHA on register if abuse detected (future).
- Allowlist/blocklist for sender domains (future).

## 7. Expiration & Cleanup Safety

- TTL indexes are the safety net; cleanup jobs are idempotent and retryable.
- Cleanup failure alerted; no silent data loss.
- Soft-delete before permanent purge; purge window configurable.

## 8. Secrets Management

- JWT secret, S3 credentials, LLM API key, provider webhook secrets in environment variables / secrets manager, never in repo.
- Local dev uses `.env` (gitignored); production uses platform secrets.

## 9. Decisions Requiring Verification

- Virus scanning engine selection and integration point.
- Whether inbound provider can enforce recipient validation (unknown user) at SMTP time vs webhook.
- Exact webhook signature header/algorithm per provider.

## 10. Assumptions

- TLS terminated at LB/cloud edge; internal traffic trusted within VPC.
- Client runs in modern browser with CSP.
