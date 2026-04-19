# AGENTS.md

## Commands

### Backend (Bun)
```bash
cd backend
bun install
bun run src/index.ts   # dev server on port 5050
bun test              # run tests
bunx eslint .         # lint
```

### Frontend (Next.js)
```bash
cd frontend
npm install          # NOT bun
npm run dev           # port 3000
npm run build
npm run lint          # uses ESLint 9
```

### Full Stack
```bash
docker compose up                # all services
docker compose --profile dev up  # includes CloudBeaver on :8978
```

## Key Constraints

- **Next.js 16**: Has breaking changes from v15. Do not rely on v15 routing/config patterns. Check `node_modules/next/dist/docs/` for the actual API.
- **Frontend uses npm, not bun**: Package manager differs between frontend and backend.
- **Room owner cannot leave**: Must dismiss room instead. Max 50 members per room.
- **JWT is 64-char hex string**, not a standard JWT token (uses `jose` library).
- **Cursor-based pagination**: Newest-first by `created_at`.

## Important Paths

- Backend entry: `backend/src/index.ts`
- Routes: `backend/src/routes/`
- DB helpers: `backend/src/db/`
- API spec: `docs/API_SPEC.md`
- Schema: `database/init/01-users.sql`

## Testing

- Backend has built-in tests via `bun test`
- Frontend has no test suite configured