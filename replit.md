# 个人仪表盘 (Personal Dashboard)

## Overview

A Chinese personal dashboard application — full-stack React + Express + PostgreSQL monorepo.
Features: email/password auth with session cookies, private memos with image attachments and reminders,
real-time clock, city weather (via open-meteo), and upcoming 90-day Chinese holidays (via nager.at).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Frontend**: React + Vite + Tailwind + shadcn/ui (artifact: printf-app, path `/`)
- **Backend**: Express + pino-http + cookie-parser (artifact: api-server, path `/api`)
- **Database**: PostgreSQL via Drizzle ORM (workspace lib: `@workspace/db`)
- **API codegen**: OpenAPI spec → orval → React Query hooks (lib: `@workspace/api-client-react`)

## Packages

| Package | Path | Description |
|---|---|---|
| `@workspace/api-server` | `artifacts/api-server` | Express REST API |
| `@workspace/printf-app` | `artifacts/printf-app` | React SPA dashboard |
| `@workspace/db` | `lib/db` | Drizzle schema + client |
| `@workspace/api-spec` | `lib/api-spec` | OpenAPI 3.1 spec |
| `@workspace/api-zod` | `lib/api-zod` | Generated Zod schemas (orval) |
| `@workspace/api-client-react` | `lib/api-client-react` | Generated React Query hooks (orval) |

## Database Schema

Tables: `users`, `sessions`, `memos`, `cities`, `preferences`

- **users**: id (uuid), email (unique), passwordHash, timezone, createdAt
- **sessions**: id, userId (FK), tokenHash (unique), idleExpiresAt, absoluteExpiresAt
- **memos**: id, userId, title, content, remindAt, reminderAcknowledgedAt, imageDataUrl, createdAt, updatedAt
- **cities**: id, userId, name, country, latitude, longitude, timezone, isDefault
- **preferences**: id, userId (unique), timezone

## API Routes

All routes under `/api`:

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /healthz | No | Health check |
| POST | /auth/register | No | Register |
| POST | /auth/login | No | Login |
| POST | /auth/logout | No | Logout |
| GET | /auth/me | Yes | Current user |
| GET | /bootstrap | Yes | All data in one request |
| GET | /memos | Yes | List memos |
| POST | /memos | Yes | Create memo |
| PUT | /memos/:id | Yes | Update memo |
| DELETE | /memos/:id | Yes | Delete memo |
| POST | /memos/:id/ack-reminder | Yes | Acknowledge reminder |
| GET | /cities | Yes | List saved cities |
| POST | /cities/search | Yes | Search cities (open-meteo geocoding) |
| POST | /cities | Yes | Add city |
| POST | /cities/:id/default | Yes | Set default city |
| DELETE | /cities/:id | Yes | Remove city |
| GET | /weather | Yes | Current weather for default city |
| GET | /holidays | Yes | Upcoming 90-day CN holidays |

## Auth

- scrypt password hashing (`salt:hash` format)
- Session tokens: 32-byte random base64url, stored as SHA-256 hash
- Cookie name: `dashboard_session` (HttpOnly, SameSite=Lax)
- Session TTL: 7-day idle / 30-day absolute

## External APIs

- **Weather**: open-meteo.com (free, no key needed) — 10-min cache
- **Geocoding**: open-meteo.com geocoding endpoint — no cache
- **Holidays**: date.nager.at (free, no key needed) — 24-hour cache

## Development

```bash
# Start API server
pnpm --filter @workspace/api-server run dev

# Start frontend
pnpm --filter @workspace/printf-app run dev

# Push DB schema
pnpm --filter @workspace/db run db:push

# Regenerate API hooks from spec
pnpm --filter @workspace/api-zod run generate
pnpm --filter @workspace/api-client-react run generate
```
