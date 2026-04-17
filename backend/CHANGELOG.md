# Backend Changelog

## [Unreleased] — 2026-04-17

### Added

#### Infrastructure
- `src/index.ts` — Hono app entry point; mounts CORS, request logger, and both API routers; serves on `PORT` env var (default `5050`)
- `src/db/connection.ts` — mysql2 connection pool (`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`)
- `src/db/types.ts` — TypeScript row interfaces: `UserRow`, `RoomRow`, `RoomMemberRow`, `UserTokenRow`
- `src/lib/errors.ts` — `apiError()` helper; all error responses follow `{ error: { code, message, details } }`
- `src/lib/jwt.ts` — `signToken` / `verifyToken` using `jose` (HS256, 7-day expiry, secret from `JWT_SECRET`)
- `src/middleware/auth.ts` — Bearer JWT middleware; verifies signature and checks `user_tokens.revoked_at`; injects `userId` and `tokenId` into Hono context

#### Auth routes (`/api/v1/auth`)
- `POST /register` — validates all fields, checks duplicate email/username/phone, hashes password with `Bun.password.hash`, issues JWT
- `POST /login` — identifier (email, username, or phone) + password login; issues JWT
- `POST /logout` — revokes the current token by setting `user_tokens.revoked_at`
- `POST /passkey/register/start` — stub (501)
- `POST /passkey/register/finish` — stub (501)
- `POST /passkey/login/start` — stub (501)
- `POST /passkey/login/finish` — stub (501)
- `DELETE /passkey/:passkey_id` — stub (501)
- `GET /passkey/list` — stub (501)

> Passkey endpoints require `@teamhanko/passkeys-sdk` or `@simplewebauthn/server` to be implemented.

#### Room routes (`/api/v1/rooms`)
- `GET /` — list rooms the authenticated user has joined; cursor-based pagination
- `GET /hall` — public room listing; supports `include_joined` and `include_full` query flags; cursor-based pagination
- `POST /` — create a room; owner is automatically inserted as the first member
- `POST /:room_id/join` — join a room; enforces capacity and duplicate-membership checks
- `POST /:room_id/leave` — leave a room; owner is blocked (must dismiss instead)
- `DELETE /:room_id` — dismiss a room (owner only); sets `status = 'closed'`

#### Database schema
- `database/init/01-users.sql` — creates `users`, `rooms`, `room_members`, `user_tokens` tables with FK constraints and cascade deletes
