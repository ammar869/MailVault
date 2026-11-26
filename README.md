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

To run the API and background worker as well, start MongoDB and Redis locally, set
`MONGODB_URI` and `REDIS_URL` in `.env`, then run these in separate terminals:

```bash
npm run dev:server
npm run dev:worker
```

The client can load without those services, but login, email, inbox, and other
API-backed features require MongoDB and Redis to be running locally.

## Other scripts

- `npm run lint` — lint all workspaces
- `npm run typecheck` — type-check all workspaces
- `npm run build` — build all workspaces

Docker Compose files remain under `infrastructure/` for later use, but the
development instructions above do not start or depend on Docker.
