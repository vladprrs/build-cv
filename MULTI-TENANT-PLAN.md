# Multi-Tenant Architecture Plan

## Context

Build CV is currently a single-user headless CMS with no auth. We need to transform it into a multi-tenant platform where:
- **Anonymous users** work with IndexedDB in the browser (no account needed)
- **Authenticated users** (GitHub/Google OAuth) get a personal Turso database
- **On first login**, local data auto-migrates to the user's Turso DB
- **Authenticated users** see a Turso read-only token + DB URL for n8n integration
- **User metadata** (accounts, DB mappings) lives in a separate admin Turso DB

---

## Phase 0: Foundation

**New dependencies:**
```bash
npm install next-auth@5 @auth/drizzle-adapter dexie dexie-react-hooks
```

**Extract shared types** from `src/app/actions.ts` into `src/lib/data-types.ts`:
- `SearchFilters` (line ~525), `JobWithFilteredHighlights` (line ~952), `BackupData`, `ImportResult`
- These become the contract between IndexedDB and Turso data layers

---

## Phase 1: Admin DB + Auth

### 1.1 Admin DB Schema — `src/auth/admin-schema.ts`
Drizzle schema for the admin Turso DB:
- `users` — Auth.js standard (id, email, name, image)
- `accounts` — Auth.js OAuth accounts
- `sessions`, `verificationTokens` — Auth.js standard
- `userDatabases` — userId, tursoDbName, tursoDbUrl, tursoAuthToken, tursoReadOnlyToken, status (creating/migrating/ready/error)

### 1.2 Admin DB Connection — `src/db/admin.ts`
- `getAdminDb()` — singleton connecting to `TURSO_ADMIN_DB_URL`

### 1.3 Auth.js Config — `src/auth/index.ts`
- Providers: GitHub + Google
- Adapter: `@auth/drizzle-adapter` → admin DB
- Session strategy: **JWT** (stateless, edge-compatible)
- Callbacks: attach `userId` to JWT/session

### 1.4 Auth Route — `src/app/api/auth/[...nextauth]/route.ts`

### 1.5 Middleware — `src/middleware.ts`
- Auth.js middleware — attaches session to requests, does NOT block anonymous users

### New env vars:
```
TURSO_ADMIN_DB_URL, TURSO_ADMIN_DB_TOKEN
TURSO_PLATFORM_API_TOKEN, TURSO_ORG_NAME
AUTH_GITHUB_ID, AUTH_GITHUB_SECRET
AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
AUTH_SECRET
```

---

## Phase 2: Dynamic DB Connections

### 2.1 Modify `src/db/index.ts`
- Keep `getOwnerDb()` (current behavior, backward-compat)
- Add `getUserDb(userId)` — looks up credentials in admin DB, caches connections
- Keep `export const db = ...` for backward-compat during transition

### 2.2 Turso Platform API — `src/db/turso-platform.ts`
- `createUserDatabase(userId)` → POST to Turso Platform API
  - Creates DB, generates RW + read-only tokens
  - Returns `{ dbName, dbUrl, authToken, readOnlyToken }`

### 2.3 Schema Migration — `src/db/migrate-user-db.ts`
- Runs the DDL from `drizzle/0000_panoramic_talon.sql` against new user DBs
- Uses raw SQL execution via `@libsql/client`

---

## Phase 3: Data Layer Abstraction (core refactor)

### 3.1 DataLayer Interface — `src/lib/data-layer/index.ts`
Shared interface for all data operations:
```
getJobs(), createJob(), updateJob(), deleteJob()
getHighlights(), createHighlight(), updateHighlight(), deleteHighlight()
searchJobsWithHighlights(filters), getAllDomains(), getAllSkills()
exportDatabase(), importDatabase(), clearDatabase()
exportAllRawData()  // for migration
```

### 3.2 Server DataLayer — `src/lib/data-layer/server-data-layer.ts`
- Class that accepts a Drizzle `db` instance
- Reuses existing logic from `src/app/actions.ts` (same queries)
- No `revalidatePath` here — that stays in server actions

### 3.3 Client DataLayer (Dexie) — `src/lib/data-layer/client-data-layer.ts`
- Dexie DB with `jobs` + `highlights` tables mirroring the schema
- Implements same DataLayer interface
- Filtering logic mirrors the JS-based filtering in actions.ts (fetches all, then filters in JS — same pattern)

### 3.4 Server Action Proxy — `src/lib/data-layer/server-action-proxy.ts`
- Thin wrapper: maps DataLayer interface methods → server action calls
- Used by authenticated users on the client side

### 3.5 Data Context — `src/contexts/data-context.tsx`
- `DataProvider` wraps the app
- Detects session status → creates ClientDataLayer (anonymous) or ServerActionProxy (authenticated)
- `useDataLayer()` hook returns `{ dataLayer, mode: 'anonymous' | 'authenticated' }`

---

## Phase 4: Refactor Server Actions

### Modify `src/app/actions.ts`
- Add helper `getDataLayer()`: calls `auth()`, gets user's DB via `getUserDb()`, returns `ServerDataLayer`
- Each server action: `const dl = await getDataLayer(); return dl.method(...)`
- `revalidatePath()` stays in server actions after DataLayer calls
- Anonymous users NEVER call server actions — they use ClientDataLayer directly

### New file `src/app/actions/user-db.ts`
- `provisionUserDatabase()` — creates Turso DB for user, stores in admin DB
- `getUserDatabaseInfo()` — returns DB URL + read-only token for settings page
- `migrateLocalData({ jobs, highlights })` — writes local data to user's DB

---

## Phase 5: UI Refactoring

### 5.1 Homepage — `src/app/page.tsx`
Two rendering paths:
- **Authenticated**: Server-side fetch via `searchJobsWithHighlights()` (current behavior)
- **Anonymous**: Pass empty `initialJobs`, UnifiedFeed loads from IndexedDB on mount

### 5.2 UnifiedFeed — `src/components/unified-feed/unified-feed.tsx`
- New prop `mode: 'anonymous' | 'authenticated'`
- Anonymous: creates `ClientDataLayer`, fetches from IndexedDB in `useEffect`
- Authenticated: uses server actions (current behavior)
- All CRUD in dialogs/forms use `useDataLayer()` hook

### 5.3 Dialogs — highlight-dialog.tsx, job-dialog.tsx
- Use `useDataLayer()` hook instead of importing server actions directly
- `router.refresh()` only in authenticated mode

### 5.4 Layout — `src/app/layout.tsx`
- Wrap with `SessionProvider` + `DataProvider` + `MigrationHandler`

### 5.5 Auth UI Components (new)
- `src/components/auth/auth-button.tsx` — Sign in / avatar+sign out
- `src/components/auth/mode-indicator.tsx` — "Local Mode" badge for anonymous

---

## Phase 6: Migration Flow (IndexedDB → Turso)

### `src/components/auth/migration-handler.tsx`
On first login:
1. `provisionUserDatabase()` — create Turso DB
2. `clientDataLayer.exportAllRawData()` — read all from IndexedDB
3. `migrateLocalData(data)` — server action writes to user's Turso DB
4. `clientDataLayer.clearDatabase()` — clear IndexedDB
5. Show fullscreen "Migrating..." overlay during process

---

## Phase 7: Settings Page

### Modify `src/app/settings/page.tsx`
- **Account section**: user info, sign in/out
- **n8n Integration section** (authenticated only):
  - Display Turso DB URL + read-only token with copy buttons
  - Instructions for connecting n8n
- **Data storage indicator**: "Stored locally" vs "Stored in cloud"
- Backup/restore uses DataLayer abstraction

---

## Files Summary

### New files (~18):
```
src/auth/index.ts
src/auth/admin-schema.ts
src/app/api/auth/[...nextauth]/route.ts
src/middleware.ts
src/db/admin.ts
src/db/turso-platform.ts
src/db/migrate-user-db.ts
src/lib/data-types.ts
src/lib/data-layer/index.ts
src/lib/data-layer/server-data-layer.ts
src/lib/data-layer/client-data-layer.ts
src/lib/data-layer/server-action-proxy.ts
src/contexts/data-context.tsx
src/components/auth/auth-button.tsx
src/components/auth/mode-indicator.tsx
src/components/auth/migration-handler.tsx
src/app/actions/user-db.ts
drizzle-admin.config.ts
```

### Modified files (~7):
```
src/db/index.ts                              — getUserDb(), getOwnerDb()
src/app/actions.ts                           — session checks, getDataLayer() helper
src/app/page.tsx                             — dual rendering path
src/app/layout.tsx                           — SessionProvider, DataProvider
src/app/settings/page.tsx                    — account + n8n sections
src/components/unified-feed/unified-feed.tsx — mode prop, anonymous data loading
src/components/dialogs/highlight-dialog.tsx  — useDataLayer() hook
src/components/dialogs/job-dialog.tsx        — useDataLayer() hook
package.json                                 — new deps
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Server Components can't access IndexedDB | Homepage detects mode via `auth()`, passes `mode` prop to client component |
| Turso free tier: 500 DBs | Track in admin DB, implement cleanup for inactive users |
| `revalidatePath` cache shared across users | Use `force-dynamic` on data pages, or move to client-side data management with React Query |
| Type divergence Dexie vs Drizzle | Shared DataLayer interface + shared types enforce contract |
| Server action security (currently zero auth) | `getDataLayer()` helper centralizes session check |

---

## Verification

1. **Anonymous flow**: Open incognito → create job + highlight → refresh page → data persists (IndexedDB) → check DevTools IndexedDB
2. **Auth flow**: Sign in with GitHub → DB provisioned (check admin DB) → create data → data persists across devices
3. **Migration flow**: Add data anonymously → sign in → data appears in authenticated view → IndexedDB cleared
4. **n8n token**: Settings page → copy Turso URL + token → use in n8n HTTP node → query returns user's data
5. **Isolation**: User A's data not visible to User B
