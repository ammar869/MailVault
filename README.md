# MailVault

## Run without Docker

Install the Node dependencies once:

```bash
npm install
```

Start the client:

```bash
npm run dev:client
```

Open <http://localhost:5173>.

To run the API, start MongoDB locally and set `MONGODB_URI` in `.env`. Redis is
needed for background email processing and realtime features; start it locally
and set `REDIS_URL` before running the worker:

```bash
npm run dev:server
npm run dev:worker
```

The client can load without those services. Login and inbox management need
MongoDB; inbound email processing, realtime updates, and scheduled cleanup also
need Redis. Real inbound delivery additionally requires a verified email domain
and provider webhook configuration.

## Other scripts

- `npm run lint` — lint all workspaces
- `npm run typecheck` — type-check all workspaces
- `npm run build` — build all workspaces

Docker is disabled for now. The Compose configuration under `infrastructure/`
is commented out; local development does not start or depend on Docker.
