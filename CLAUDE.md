# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Build CV is a multi-tenant Headless CMS for managing professional career data. Users store atomic "highlights" (achievements, projects, responsibilities) with rich metadata (metrics, skills, domains).

- **Anonymous users** work with IndexedDB in the browser (no account needed)
- **Authenticated users** (GitHub/Google OAuth) get a personal Turso database
- **On first login**, local data auto-migrates to the user's Turso DB
- **Authenticated users** can see their Turso read-only token + DB URL for n8n integration

**Production URL:** https://build-cv-henna.vercel.app

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server (http://localhost:3000)
npm run build            # Production build
npm run lint             # ESLint

# User Data DB (Drizzle + Turso)
npm run db:generate      # Generate migrations from schema changes
npm run db:migrate       # Apply migrations to database
npm run db:push          # Push schema directly (dev only, skips migrations)
npm run db:studio        # Open Drizzle Studio GUI
npm run db:seed          # Seed test data (tsx src/db/seed.ts)

# Admin DB (auth, user metadata)
npm run db:admin:generate  # Generate admin DB migrations
npm run db:admin:migrate   # Apply admin DB migrations
npm run db:admin:push      # Push admin schema directly
# Note: admin DB commands need dotenv: npx dotenv -e .env.local -- npm run db:admin:push
```

## Architecture

### Tech Stack
- Next.js 16 (App Router) + TypeScript
- Auth.js v5 (next-auth) — GitHub + Google OAuth, JWT sessions
- Turso (libSQL/SQLite edge database) + Drizzle ORM
- Dexie (IndexedDB) for anonymous client-side storage
- Tailwind CSS + shadcn/ui + [Tailark Veil](https://tailark.com/veil)
- React Hook Form + Zod validation

### Multi-Tenant Architecture

Two databases:
- **Admin DB** (`TURSO_ADMIN_DB_URL`) — Auth.js tables (users, accounts, sessions) + `userDatabases` mapping
- **Per-user DBs** — Provisioned via Turso Platform API on first login, each user gets their own Turso DB

Data access pattern:
- `DataLayer` interface (`src/lib/data-layer/types.ts`) — shared contract for all data operations
- `ServerDataLayer` — Drizzle/Turso implementation (authenticated users)
- `ClientDataLayer` — Dexie/IndexedDB implementation (anonymous users)
- `ServerActionProxy` — Client-side wrapper that calls server actions (authenticated users in browser)
- `DataContext` (`src/contexts/data-context.tsx`) — React context providing `useDataLayer()` hook

### Data Model

Two main entities in `src/db/schema.ts`:

- **Jobs** — Employment contexts (company, role, dates)
- **Highlights** — Atomic experience units linked to jobs, with:
  - Type: `achievement | project | responsibility | education`
  - Tags: `domains[]`, `skills[]`, `keywords[]` (JSON arrays)
  - Metrics: `{ label, value, unit, prefix?, description? }[]`
  - Soft delete via `isHidden` flag

### Key Files

- `src/app/actions.ts` — Server Actions with `getDataLayer()` helper for session-based DB routing
- `src/app/actions/user-db.ts` — User DB provisioning, info retrieval, data migration
- `src/lib/data-layer/` — DataLayer interface + 3 implementations
- `src/auth/index.ts` — Auth.js config (providers, adapter, callbacks)
- `src/auth/admin-schema.ts` — Admin DB Drizzle schema
- `src/db/index.ts` — DB connections (`getOwnerDb()`, `getUserDb(userId)`)
- `src/db/turso-platform.ts` — Turso Platform API client (DB provisioning, token creation)
- `src/db/migrate-user-db.ts` — Runs DDL against new user DBs
- `src/contexts/data-context.tsx` — DataProvider + `useDataLayer()` hook
- `src/components/auth/` — AuthButton, ModeIndicator, MigrationHandler
- `src/lib/types.ts` — Shared TypeScript types (Job, Highlight, Insert/Update types)
- `src/lib/data-types.ts` — Shared composite types (SearchFilters, BackupData, etc.)

### Page Structure

| Route | Purpose |
|-------|---------|
| `/` | Timeline view — server-rendered for authenticated, client-loaded for anonymous |
| `/settings` | Account info, n8n integration (DB URL + read-only token), data storage indicator |
| `/api/auth/[...nextauth]` | Auth.js route handler |

### Conventions

- Use Server Actions (not API routes) for mutations
- All server actions use `getDataLayer()` to route to the correct user DB
- Anonymous users never call server actions — they use `ClientDataLayer` directly
- Call `revalidatePath()` after data changes (authenticated mode only)
- Store dates as ISO strings (`YYYY-MM-DD`)
- UUIDs via `crypto.randomUUID()`
- Zod validation on both client forms and server actions
- `undefined` from Zod optional fields must be normalized to `null` before passing to DataLayer

## Environment Variables

```bash
# Owner/default data DB
TURSO_DATABASE_URL="libsql://your-db.turso.io"
TURSO_AUTH_TOKEN="your-token"
LOCAL_DB_PATH="./cv_data.db"                    # Local dev fallback

# Admin DB (auth + user metadata)
TURSO_ADMIN_DB_URL="libsql://your-admin-db.turso.io"
TURSO_ADMIN_DB_TOKEN="your-admin-token"

# Turso Platform API (for provisioning user DBs)
TURSO_PLATFORM_API_TOKEN="your-platform-token"
TURSO_ORG_NAME="your-org"

# Auth.js
AUTH_SECRET="generated-secret"                  # npx auth secret
AUTH_GITHUB_ID="github-oauth-app-id"
AUTH_GITHUB_SECRET="github-oauth-app-secret"
AUTH_GOOGLE_ID="google-oauth-client-id"
AUTH_GOOGLE_SECRET="google-oauth-client-secret"
```

## Git Workflow

- Branch naming: `feature/*`, `bugfix/*`, `hotfix/*`
- Commits: Conventional Commits format (`feat(scope): message`)
- PRs to `main` → auto-deploys to Vercel production
