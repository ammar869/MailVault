# MailVault — API Specification

## 1. Conventions

- Base path: `/api/v1`
- Request/Response envelope:
  - Success: `{ "data": <T>, "meta": { ... }? }`
  - Error: `{ "error": { "code": "string", "message": "string", "details": [...]? } }`
- Content-Type: `application/json`
- Dates: ISO-8601 UTC strings
- Validation: Zod schemas on body/query/params; 400 on failure
- Errors use standard HTTP status codes (400, 401, 403, 404, 409, 422, 429, 500)

## 2. Authentication

- Session auth: `Authorization: Bearer <accessToken>` JWT, short-lived.
- Refresh: `POST /auth/refresh` with refresh token (httpOnly cookie or body), returns new access + rotated refresh.
- Developer API: `X-API-Key: <key>` header on `/api/v1/developer/*`; scoped by API key.
- Webhooks inbound: provider signature verification (no JWT).
- Webhooks outgoing (developer): HMAC signed using endpoint secret.

## 3. REST Modules and Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | /auth/register | Create account | none |
| POST | /auth/login | Issue access + refresh tokens | none |
| POST | /auth/logout | Invalidate refresh token | JWT |
| POST | /auth/refresh | Rotate access/refresh tokens | refresh token |
| GET | /auth/me | Current user profile | JWT |
| POST | /auth/verify-email | Verify email address | token |

### Inboxes (temporary/disposable)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | /inboxes | List user inboxes | JWT |
| POST | /inboxes | Create temp/disposable inbox | JWT |
| GET | /inboxes/:id | Get inbox detail | JWT + owner |
| PATCH | /inboxes/:id | Update settings/expiration/aiEnabled | JWT + owner |
| DELETE | /inboxes/:id | Delete inbox + emails | JWT + owner |

### Emails
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | /emails | List emails (filter by inbox, status, date) | JWT + owner |
| GET | /emails/:id | Get email (headers, body, attachments meta) | JWT + owner |
| PATCH | /emails/:id | Mark read/archive/delete | JWT + owner |
| DELETE | /emails/:id | Soft-delete email | JWT + owner |
| GET | /emails/:id/attachments/:attachmentId/url | Get short-lived S3 presigned download URL | JWT + owner |

### Aliases (privacy forwarding)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | /aliases | List aliases | JWT |
| POST | /aliases | Create alias → target inbox | JWT |
| PATCH | /aliases/:id | Toggle active / expiration | JWT + owner |
| DELETE | /aliases/:id | Delete alias | JWT + owner |

### OTP
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | /otp | List extracted OTPs for user | JWT |

### AI (opt-in)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | /ai/summarize | On-demand summary for an email | JWT + owner |
| GET | /emails/:id/summary | Get cached AI summary/category | JWT + owner |

### Developer API Keys
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | /api-keys | List keys (prefix only) | JWT |
| POST | /api-keys | Create key (returns plaintext once) | JWT |
| DELETE | /api-keys/:id | Revoke key | JWT + owner |

### Developer Webhooks
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | /webhooks | List endpoints | JWT |
| POST | /webhooks | Register endpoint (url, events, secret) | JWT |
| PATCH | /webhooks/:id | Update endpoint | JWT + owner |
| DELETE | /webhooks/:id | Delete endpoint | JWT + owner |

### Analytics
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | /analytics | Inbox/email/alias usage stats | JWT |

### Inbound (provider webhooks, public)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | /webhooks/inbound/ses | SES inbound webhook | signature |
| POST | /webhooks/inbound/mailgun | Mailgun inbound webhook | signature |

## 4. Request / Response Examples

Create inbox:
```
POST /api/v1/inboxes
{ "type": "temporary", "ttlHours": 24, "aiEnabled": false }
```
Response:
```
{ "data": { "id": "...", "address": "abc123@in.mailvault.example", "expiresAt": "..." } }
```

List emails:
```
GET /api/v1/emails?inboxId=...&status=new&limit=20
```
Response:
```
{ "data": [{ "id": "...", "subject": "...", "from": {...}, "receivedAt": "..." }], "meta": { "total": 5, "limit": 20 } }
```

## 5. Authorization Rules

- Every resource-scoped endpoint verifies `resource.ownerId === auth.userId`.
- API key auth maps key → `userId`; same ownership rules apply.
- Webhook endpoints have no user context; inbound webhook authenticates the provider, not a user.
- Admin routes (if added later) require `role === admin`.

## 6. Rate Limiting

- Auth endpoints: strict (e.g., 5 req/min per IP).
- API: per-user token bucket (e.g., 100 req/min), configurable by plan.
- Webhook delivery: per-endpoint concurrency + retry backoff.
- Inbound webhook: per-provider IP allowlist + signature verification.

## 7. Webhook Security

- Outgoing developer webhooks: HTTPS only, HMAC-SHA256 signature header (`X-MailVault-Signature`), idempotency payload ID, exponential backoff retries (max ~5), dead-letter after failure.
- Inbound provider webhooks: verify provider signature; reject non-2xx quickly; idempotent by provider message-id to handle duplicate deliveries.

## 8. OpenAPI

Swagger/OpenAPI 3.0 spec hosted at `/api-docs`, generated from route/Zod schemas.
