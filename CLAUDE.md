# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Build CV is a Headless CMS for managing professional career data. Users store atomic "highlights" (achievements, projects, responsibilities) with rich metadata (metrics, skills, domains) and export structured JSON for AI resume generation (RAG pipeline).

**Production URL:** https://build-cv-henna.vercel.app

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server (http://localhost:3000)
npm run build            # Production build
npm run lint             # ESLint

# Database (Drizzle + Turso)
npm run db:generate      # Generate migrations from schema changes
npm run db:migrate       # Apply migrations to database
npm run db:push          # Push schema directly (dev only, skips migrations)
npm run db:studio        # Open Drizzle Studio GUI
npm run db:seed          # Seed test data (tsx src/db/seed.ts)
```

## Architecture

### Tech Stack
- Next.js 16 (App Router) + TypeScript
- Turso (libSQL/SQLite edge database) + Drizzle ORM
- Tailwind CSS + shadcn/ui + [Tailark Veil](https://tailark.com/veil)
- React Hook Form + Zod validation
- Server Actions for all CRUD operations

### Data Model

Two main entities in `src/db/schema.ts`:

- **Jobs** — Employment contexts (company, role, dates)
- **Highlights** — Atomic experience units linked to jobs, with:
  - Type: `achievement | project | responsibility | education`
  - Tags: `domains[]`, `skills[]`, `keywords[]` (JSON arrays)
  - Metrics: `{ label, value, unit, prefix?, description? }[]`
  - Soft delete via `isHidden` flag

### Key Files

- `src/app/actions.ts` — All Server Actions (CRUD, search, backup, RAG export)
- `src/db/index.ts` — Database connection (auto-switches Turso vs local SQLite)
- `src/lib/types.ts` — Shared TypeScript types
- `src/lib/export-utils.ts` — RAG export formatting utilities
- `UIUX.md` — UI/UX design specification (target architecture)

### Page Structure

| Route | Purpose |
|-------|---------|
| `/` | Timeline view (jobs + highlights chronologically) |
| `/jobs` | Job management cards |
| `/jobs/[id]` | Job detail with its highlights |
| `/highlights` | Table view with search/filter/bulk operations |
| `/export` | RAG export builder (JSON/Markdown) |
| `/backup` | Full database backup/restore |

### Conventions

- Use Server Actions (not API routes) for mutations
- Call `revalidatePath()` after data changes
- Store dates as ISO strings (`YYYY-MM-DD`)
- UUIDs via `crypto.randomUUID()`
- Zod validation on both client forms and server actions

## Environment Variables

```bash
TURSO_DATABASE_URL="libsql://your-db.turso.io"  # Production
TURSO_AUTH_TOKEN="your-token"
LOCAL_DB_PATH="./cv_data.db"                    # Local dev fallback
```

## Git Workflow

- Branch naming: `feature/*`, `bugfix/*`, `hotfix/*`
- Commits: Conventional Commits format (`feat(scope): message`)
- PRs to `main` → auto-deploys to Vercel production
