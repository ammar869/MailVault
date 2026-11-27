# MailVault — Deployment Guide

## 1. Local Development (without Docker)

Install Node dependencies with `npm install`. Start MongoDB as a local service and
set `MONGODB_URI` plus the JWT secrets in `.env`; then run `npm run dev:server` and
`npm run dev:client` in separate terminals. The client is available at
`http://localhost:5173`. Redis is required for the worker, queues and realtime
features; set `REDIS_URL` and run `npm run dev:worker` when Redis is available.

Environment variables (`.env`, gitignored):
```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/mailvault
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>
BCRYPT_ROUNDS=12
S3_BUCKET=mailvault-dev
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=<key>
S3_SECRET_KEY=<secret>
LLM_API_KEY=<key>
LLM_BASE_URL=https://api.example.com/v1
WEBHOOK_SECRET_SES=<secret>
SES_SNS_TOPIC_ARN=<expected-ses-notification-topic-arn>
WEBHOOK_SECRET_MAILGUN=<secret>
CLIENT_ORIGIN=http://localhost:5173
```

Inbound endpoints are `/webhooks/inbound/ses` and `/webhooks/inbound/mailgun`.
For SES, send notifications through SNS and set `SES_SNS_TOPIC_ARN`; the server verifies
the SNS RSA signature and rejects unexpected topics. `WEBHOOK_SECRET_SES` is only for
the direct signed adapter mode. For Mailgun, set the account's Webhook Signing Key;
the route verifies the signed timestamp/token and accepts Mailgun's multipart form post.
Raw accepted messages are retained in MongoDB for up to seven days while parsing jobs run.

## 2. Docker Artifacts (disabled for now)

Docker Compose is commented out under `infrastructure/docker-compose.yml` per the
current local development setup. The Dockerfiles remain as reference artifacts.

- `Dockerfile.client` — Vite build → Nginx static serve.
- `Dockerfile.server` — Node production, runs Express API.
- `Dockerfile.worker` — Node production, runs BullMQ worker.
- Multi-stage builds; `npm ci` only.

## 3. Production Considerations

- Replace MinIO with Amazon S3.
- Replace self-hosted MongoDB/Redis with managed equivalents (MongoDB Atlas, Redis/ElastiCache) or self-hosted HA.
- Inbound email provider: AWS SES, Mailgun, or equivalent; configure MX/SPF/DKIM/DMARC on customer domains.
- Secrets via platform secret manager (AWS Secrets Manager, etc.).
- TLS via LB or cloud-managed certs.
- Rolling deploy for server/worker; zero-downtime not required for MVP but drain connections on stop.
- Database migrations: none at MVP (Mongoose schema); use `mongoose` validation; consider migration tool for schema changes later.
- Backups: MongoDB snapshots; S3 versioning/lifecycle; Redis persistence optional (cache/queue).
- Monitoring: health check `/health`, structured logs, error tracking, queue depth alerts, webhook lag alerts.

## 4. Environment Matrix

| Variable | Dev | Prod |
|---|---|---|
| S3 | MinIO local | Amazon S3 |
| MongoDB | Local service | Atlas / self-hosted |
| Redis | Local service | ElastiCache / self-hosted |
| Inbound provider | SES sandbox / Mailgun test | SES production / Mailgun |
| TLS | none / self-signed | managed certs |

## 5. Decisions Requiring Verification

- SES inbound email availability in target AWS region (region-limited feature).
- Managed Redis BullMQ compatibility (cluster mode considerations).
- S3 CORS and presigned URL signing with chosen provider.

## 6. Checklist

- [x] Docker disabled for local development
- [ ] `/health` returns 200
- [ ] Secrets not in repo
- [ ] S3 bucket private
- [ ] Inbound MX/SPF/DKIM verified with provider
- [ ] Webhook signature secrets configured
- [ ] Backup strategy for MongoDB defined
