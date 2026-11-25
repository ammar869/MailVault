# MailVault - Phase 0 Scaffolding Complete

## Quick Start

```bash
# Install dependencies (using pnpm)
pnpm install

# Start all services with Docker Compose
docker-compose -f infrastructure/docker-compose.yml up --build

# Or start individually:
# Terminal 1: pnpm dev:server
# Terminal 2: pnpm dev:worker
# Terminal 3: pnpm dev:client
```

## Verify

- **Server health**: http://localhost:4000/api/v1/health
- **Client**: http://localhost:5173
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

## Project Structure

```
MailVault/
├── client/          # React + Vite + Tailwind
├── server/          # Express API
├── worker/          # BullMQ background jobs
├── infrastructure/  # Docker, nginx configs
├── docs/            # Architecture documentation
└── tests/           # (to be added)
```

## Available Scripts

- `pnpm lint` - Lint all workspaces
- `pnpm typecheck` - Type-check all workspaces
- `pnpm test` - Run tests (when added)
- `pnpm docker:up` - Start Docker Compose stack
- `pnpm docker:down` - Stop Docker Compose stack

## Next Steps (Phase 1)

1. Implement authentication module (register, login, JWT)
2. Create User model and MongoDB connection
3. Add Zod validation schemas
4. Set up refresh token rotation