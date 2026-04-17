# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NoSquad is a study-group platform. It consists of three services orchestrated via Docker Compose:

- **Backend** — Bun + Hono API server (port 5050)
- **Frontend** — Next.js 16 + React 19 app (port 3000)
- **Database** — MariaDB 11.8 (port 3306); CloudBeaver GUI available on port 8978 in the `dev` Docker Compose profile

## Running the Stack

```bash
# Start all services (production-like)
docker compose up

# Start with CloudBeaver DB GUI (dev profile)
docker compose --profile dev up
```

## Backend (Bun/Hono)

```bash
cd backend
bun install
bun run src/index.ts   # dev server
bun test               # run tests
bunx eslint .          # lint
```

Entry point: `backend/src/index.ts`. Routes live under `backend/src/routes/`, middleware under `backend/src/middleware/`, DB helpers under `backend/src/db/`.

## Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev    # dev server on port 3000
npm run build
npm run lint
```

**Next.js 16 breaking changes**: This project uses Next.js 16.2.3 which has breaking API differences from versions ≤15. Refer to the official Next.js 16 migration guide — do not rely on Next.js ≤15 knowledge for routing or config APIs.

## API Design

Full specification: `docs/API_SPEC.md`.

- Base paths: `/api/v1/auth`, `/api/v1/rooms`
- Auth: `Authorization: Bearer <access_token>` (JWT via `jose`)
- Passkey/WebAuthn supported alongside password auth
- Error responses: `{ "error": { "code": "...", "message": "...", "details": [] } }`
- Pagination: cursor-based, newest-first by `created_at`

### Key domain rules
- Rooms have a max capacity of 50 members
- Room owner cannot leave; must dismiss the room instead
- Ownership transfer not supported

## Database

Init SQL scripts go in `database/init/` (run once on first container start). Schema file: `database/init/01-users.sql`.

Environment variables consumed by MariaDB and the backend:

| Variable | Purpose |
|---|---|
| `DB_ROOT_PASSWORD` | MariaDB root password |
| `DB_DATABASE` | Database name (default: `nosquad`) |
| `DB_USER` | App DB user |
| `DB_PASSWORD` | App DB user password |

## Dev Container

`.devcontainer/` has per-service dev container configs (backend, frontend, database) for VS Code.
