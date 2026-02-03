# AGENTS.md — Build CV

Guidelines for AI agents working on the **Build CV** project.

---

## 1. Project Overview

Build CV is a local web-based Headless CMS for managing professional career data. It stores atomic "highlights" of experience with rich metadata (metrics, skills, domains) and enables structured export for AI resume generation.

**Key Principle:** Data is stored in Turso (libSQL) edge database. The app is a personal database with a CRUD UI, deployed on Vercel's edge network.

**Why Turso:**
- SQLite-compatible (lightweight, familiar)
- Edge-native (works with Vercel Edge Functions)
- Global replication (fast reads anywhere)
- Free tier generous (500 databases, 1GB each)
- Works seamlessly with Drizzle ORM

**Vercel Considerations:**
- Edge Functions preferred (lower latency)
- Turso HTTP driver works in Edge runtime
- Environment variables for Turso auth token

---

## 2. Tech Stack (MUST USE)

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (Strict mode) |
| Database | **Turso** (libSQL / SQLite-compatible edge database) |
| Deployment | **Vercel** (Serverless Edge) |
| ORM | **Drizzle ORM** (preferred) |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui + **Tailark Veil** |
| Design System | **Tailark Veil Kit** — minimalist marketing blocks |
| Forms | React Hook Form + Zod |
| State | React Query (TanStack Query) for server state |
| Icons | Lucide React |

---

## 3. Project Structure

```
/home/coder/project/
├── AGENTS.md              # This file
├── PRD.MD                 # Product requirements
├── .env.local             # Environment variables (gitignored)
├── vercel.json            # Vercel configuration
├── drizzle.config.ts      # Drizzle configuration
├── next.config.js
├── tailwind.config.ts
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx       # Dashboard (Timeline view)
│   │   ├── highlights/
│   │   │   └── page.tsx   # Table view
│   │   ├── export/
│   │   │   └── page.tsx   # RAG Export page
│   │   └── api/           # API routes (if needed)
│   ├── components/
│   │   ├── ui/            # shadcn components (low-level)
│   │   ├── forms/         # Form components
│   │   ├── views/         # Page-level view components
│   │   └── widgets/       # Reusable widgets (stats, filters)
│   ├── db/
│   │   ├── schema.ts      # Drizzle schema definitions
│   │   ├── index.ts       # Database connection
│   │   └── queries.ts     # Typed query helpers
│   ├── lib/
│   │   ├── utils.ts       # Utilities (cn, etc.)
│   │   └── types.ts       # Shared TypeScript types
│   └── hooks/
│       └── use-highlights.ts  # React Query hooks
```

---

## 4. Database Schema (Drizzle)

Reference PRD.MD section 2.2. Use Turso (libSQL) with Drizzle ORM:

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Jobs table (employment contexts)
export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(), // UUID
  company: text('company').notNull(),
  role: text('role').notNull(),
  startDate: text('start_date').notNull(), // ISO Date
  endDate: text('end_date'),
  logoUrl: text('logo_url'),
  website: text('website'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Highlights table (atomic experience units)
export const highlights = sqliteTable('highlights', {
  id: text('id').primaryKey(), // UUID
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  type: text('type', { enum: ['achievement', 'project', 'responsibility', 'education'] }).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  // Tags stored as JSON arrays
  domains: text('domains', { mode: 'json' }).$type<string[]>().notNull().default([]),
  skills: text('skills', { mode: 'json' }).$type<string[]>().notNull().default([]),
  keywords: text('keywords', { mode: 'json' }).$type<string[]>().notNull().default([]),
  // Metrics stored as JSON array
  metrics: text('metrics', { mode: 'json' }).$type<Metric[]>().notNull().default([]),
  isHidden: integer('is_hidden', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

**Relations:**
```typescript
export const jobsRelations = relations(jobs, ({ many }) => ({
  highlights: many(highlights),
}));

export const highlightsRelations = relations(highlights, ({ one }) => ({
  job: one(jobs, { fields: [highlights.jobId], references: [jobs.id] }),
}));
```

---

## 5. TypeScript Types

Mirror the DB schema in `src/lib/types.ts`:

```typescript
export type HighlightType = 'achievement' | 'project' | 'responsibility' | 'education';

export interface Metric {
  label: string;
  value: number;
  unit: string;
  prefix?: string;
  description?: string;
}

export interface Job {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate?: string | null;
  logoUrl?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Highlight {
  id: string;
  jobId?: string | null;
  job?: Job | null;
  type: HighlightType;
  title: string;
  content: string;
  startDate: string;
  endDate?: string | null;
  domains: string[];
  skills: string[];
  keywords: string[];
  metrics: Metric[];
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 6. API Conventions

Prefer **Server Actions** over API routes for CRUD operations.

```typescript
// src/app/actions.ts
'use server';

import { db } from '@/db';
import { highlights, jobs } from '@/db/schema';
import { eq, and, like, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getJobsWithHighlights() {
  return db.query.jobs.findMany({
    with: { highlights: { where: eq(highlights.isHidden, false) } },
    orderBy: (jobs, { desc }) => [desc(jobs.startDate)],
  });
}

export async function createHighlight(data: InsertHighlight) {
  const result = await db.insert(highlights).values({
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).returning();
  
  revalidatePath('/');
  return result[0];
}

export async function updateHighlight(id: string, data: Partial<InsertHighlight>) {
  const result = await db.update(highlights)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(highlights.id, id))
    .returning();
  
  revalidatePath('/');
  return result[0];
}

export async function searchHighlights(query: string, filters?: Filters) {
  const conditions = [eq(highlights.isHidden, false)];
  
  if (query) {
    conditions.push(or(
      like(highlights.title, `%${query}%`),
      like(highlights.content, `%${query}%`)
    ));
  }
  
  // Add domain/skill filters as needed...
  
  return db.query.highlights.findMany({
    where: and(...conditions),
    with: { job: true },
  });
}
```

---

## 7. UI/UX Guidelines

### Design System: Tailark Veil

**Tailark Veil** is a shadcn/ui marketing blocks kit for building super minimalist, distraction-free interfaces.

**Philosophy:**
- **Minimalist**: Clean, distraction-free UI
- **Lightweight**: No unnecessary visual noise
- **Focus on content**: Content is king
- **Registry-ready**: Components installed via shadcn CLI

**Installing Veil Components:**

```bash
# Add Tailark registry first
# In components.json, add:
{
  "registries": {
    "@tailark": "https://tailark.com/r/{name}.json"
  }
}

# Then install Veil blocks
npx shadcn@latest add @tailark/veil/hero
npx shadcn@latest add @tailark/veil/features
npx shadcn@latest add @tailark/veil/content
npx shadcn@latest add @tailark/veil/cta
npx shadcn@latest add @tailark/veil/faq
npx shadcn@latest add @tailark/veil/stats
```

**Available Veil Categories:**
- `hero` — Hero sections
- `features` — Feature grids and lists
- `content` — Content sections
- `cta` — Call-to-action sections
- `faq` — FAQ sections
- `stats` — Statistics/metrics displays
- `testimonials` — Testimonial cards
- `pricing` — Pricing tables
- `logo-cloud` — Logo clouds
- `team` — Team sections
- `contact` — Contact forms
- `footer` — Footer sections

### Design Principles
- **Minimalist (Veil-style)**: Clean, distraction-free UI following Tailark Veil philosophy
- **Data-dense**: Maximize information density while maintaining clarity
- **Desktop-first**: Primary use on laptops
- **Dark/Light**: Full support for both themes (Tailark Veil supports both)

### Color Coding for Highlight Types

Use subtle Veil-style color accents:

```typescript
const typeColors = {
  achievement: 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/10',
  project: 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/10',
  responsibility: 'border-gray-500/50 bg-gray-50/50 dark:bg-gray-900/30',
  education: 'border-green-500/50 bg-green-50/50 dark:bg-green-950/10',
};

const typeBadgeVariants = {
  achievement: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100',
  project: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100',
  responsibility: 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
  education: 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-100',
};
```

### Using Veil Components

When building pages, prefer Veil components for layout sections:

```tsx
// Example: Dashboard stats using Veil stats block
import { StatsSection } from '@/components/blocks/stats-section';

<StatsSection 
  stats={[
    { label: 'Total Highlights', value: '45' },
    { label: 'Achievements', value: '12' },
    { label: 'Projects', value: '23' },
    { label: 'Skills', value: '34' },
  ]}
/>
```

### Component Patterns

**Highlight Card (Timeline):**
```tsx
<Card className={cn(typeColors[highlight.type], 'border-l-4')}>
  <CardHeader>
    <Badge variant="outline">{highlight.type}</Badge>
    <CardTitle>{highlight.title}</CardTitle>
  </CardHeader>
  <CardContent>
    <p>{highlight.content}</p>
    {highlight.metrics.length > 0 && (
      <div className="flex gap-2 mt-2">
        {highlight.metrics.map(m => (
          <Badge key={m.label} variant="secondary">
            {m.prefix}{m.value}{m.unit} {m.label}
          </Badge>
        ))}
      </div>
    )}
  </CardContent>
</Card>
```

**Tags Input with Autocomplete:**
Use `react-select` or similar for multi-select with creatable options. Store taxonomy in DB for suggestions.

---

## 8. Forms & Validation

Use Zod schemas matching the DB types:

```typescript
// src/lib/schemas.ts
import { z } from 'zod';

export const metricSchema = z.object({
  label: z.string().min(1),
  value: z.number(),
  unit: z.string(),
  prefix: z.string().optional(),
  description: z.string().optional(),
});

export const highlightSchema = z.object({
  jobId: z.string().uuid().optional().nullable(),
  type: z.enum(['achievement', 'project', 'responsibility', 'education']),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  domains: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  metrics: z.array(metricSchema).default([]),
});

export type HighlightFormData = z.infer<typeof highlightSchema>;
```

---

## 9. RAG Export Format

When implementing the export feature, generate JSON matching this exact structure:

```typescript
interface RAGExport {
  context: string;
  request_filters: {
    domains?: string[];
    skills?: string[];
    types?: HighlightType[];
  };
  highlights: {
    id: string;
    title: string;
    company?: string;
    period: string;
    description: string;
    metrics: string; // Formatted as "Label: ValueUnit, ..."
    tags: string[];
  }[];
}

// Helper to format metrics for export
function formatMetrics(metrics: Metric[]): string {
  return metrics.map(m => `${m.label}: ${m.prefix || ''}${m.value}${m.unit}`).join(', ');
}
```

---

## 10. Common Commands

```bash
# Database (Turso)
cd /home/coder/project
npx drizzle-kit generate           # Generate migrations
npx drizzle-kit migrate            # Run migrations
npx drizzle-kit push               # Push schema to Turso (dev only)
npx drizzle-kit studio             # Open Drizzle Studio

# Development
npm run dev                        # Start dev server
npm run build                      # Production build
npm run lint                       # ESLint check

# Vercel
vercel                             # Deploy to Vercel (preview)
vercel --prod                      # Deploy to production
```

### Environment Variables

Create `.env.local` for local development:

```bash
# Turso Database
TURSO_DATABASE_URL="libsql://your-db-name.turso.io"
TURSO_AUTH_TOKEN="your-auth-token"

# Local development (optional - uses file-based SQLite)
LOCAL_DB_PATH="./cv_data.db"
```

**Security Note:** The `.env.local` file is already created in this project with the database credentials and is listed in `.gitignore` to prevent accidental commits. Never commit credentials to version control!

### Turso Setup

1. **Install Turso CLI:**
   ```bash
   # macOS
   brew install tursodatabase/tap/turso
   
   # Linux
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. **Login and create database:**
   ```bash
   turso auth login
   turso db create build-cv
   turso db show build-cv --url        # Copy TURSO_DATABASE_URL
   turso db tokens create build-cv     # Copy TURSO_AUTH_TOKEN
   ```

3. **Configure `drizzle.config.ts`:**
   ```typescript
   import { defineConfig } from 'drizzle-kit';
   
   export default defineConfig({
     schema: './src/db/schema.ts',
     out: './drizzle',
     dialect: 'sqlite',
     driver: 'turso',
     dbCredentials: {
       url: process.env.TURSO_DATABASE_URL!,
       authToken: process.env.TURSO_AUTH_TOKEN,
     },
   });
   ```

4. **Database connection in code:**
   ```typescript
   // src/db/index.ts
   import { drizzle } from 'drizzle-orm/libsql';
   import { createClient } from '@libsql/client/web';
   import * as schema from './schema';
   
   // For Edge Runtime (Vercel)
   export const getDb = () => {
     const client = createClient({
       url: process.env.TURSO_DATABASE_URL!,
       authToken: process.env.TURSO_AUTH_TOKEN,
     });
     return drizzle(client, { schema });
   };
   
   // For local development (file-based SQLite)
   export const getLocalDb = () => {
     const client = createClient({
       url: process.env.LOCAL_DB_PATH || 'file:./cv_data.db',
     });
     return drizzle(client, { schema });
   };
   
   export const db = process.env.TURSO_DATABASE_URL ? getDb() : getLocalDb();
   ```

### Vercel Deployment Setup

1. **Connect repository** to Vercel dashboard
2. **Add environment variables** in Vercel Dashboard → Settings → Environment Variables:
   - `TURSO_DATABASE_URL` — your Turso database URL
   - `TURSO_AUTH_TOKEN` — your Turso auth token
3. **Configure Edge Runtime** (optional but recommended):
   ```typescript
   // app/layout.tsx or specific routes
   export const runtime = 'edge';
   ```

### Next.js Configuration for Vercel

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do NOT use output: 'export' — we need SSR for DB
  // output: 'export',
  
  images: {
    unoptimized: true,
  },
  
  // Server Actions work on Edge with Turso
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;
```

### Required Dependencies

```bash
# Core
npm install next react react-dom

# Database (Turso + Drizzle)
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit

# UI
npm install tailwindcss @tailwindcss/postcss
npm install lucide-react
npx shadcn@latest init

# Forms
npm install zod react-hook-form @hookform/resolvers

# State
npm install @tanstack/react-query

# Utilities
npm install clsx tailwind-merge
```

### package.json scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## 11. Constraints & Rules

### Database Rules (Turso/libSQL)

1. **UUIDs**: Use `text` type with `crypto.randomUUID()` for IDs
2. **Dates**: Store as ISO strings (`YYYY-MM-DD`) in text fields
3. **Soft Delete**: Use `isHidden` flag, never hard delete
4. **JSON Fields**: Use `text({ mode: 'json' })` in SQLite for arrays/objects
5. **Relations**: Always use Drizzle relations for nested queries
6. **Validation**: Zod on client AND server (never trust user input)
7. **Revalidation**: Call `revalidatePath()` after mutations

### Turso Rules

8. **Edge Compatibility**: Turso HTTP driver works in Edge Runtime
9. **Environment Variables**: Store `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel Dashboard
10. **Local Dev**: Support both Turso cloud and local file-based SQLite
11. **Migrations**: Run `drizzle-kit migrate` before deploying

### Vercel Deployment Rules

12. **Static Export**: Do NOT use `output: 'export'` — app needs server-side rendering for DB
13. **Edge Runtime**: Turso works great with Edge Runtime:
    ```typescript
    export const runtime = 'edge'; // Turso supports this!
    ```
14. **Region**: Turso replicates globally, but place Vercel functions close to primary DB for writes

---

## 12. Git Workflow Strategy

AI-агент ведёт себя как senior-разработчик: самостоятельно управляет ветками, делает атомарные коммиты, создаёт PR и мержит после ревью.

### Бранчинг: GitHub Flow

```
main ──┬──► feature/new-ui        ───► PR ───► merge
       ├──► feature/api-endpoints ───► PR ───► merge
       ├──► bugfix/auth-error     ───► PR ───► merge
       └──► hotfix/critical-bug   ───► PR ───► merge (fast)
```

**Правила веток:**
1. **main** — production-ready код, защищённая ветка
2. **feature/*** — новые фичи (от main)
3. **bugfix/*** — исправления багов (от main)
4. **hotfix/*** — срочные фиксы (от main, быстрый PR)

**Именование веток:**
```bash
feature/user-authentication
feature/rag-export-page
bugfix/dark-mode-toggle
hotfix/build-error
```

### Commit Convention: Conventional Commits

```
<type>(<scope>): <subject>

<body> (optional)

<footer> (optional)
```

**Типы:**
- `feat` — новая фича
- `fix` — исправление бага
- `docs` — документация
- `style` — форматирование, отсутствие изменения кода
- `refactor` — рефакторинг кода
- `test` — добавление тестов
- `chore` — обслуживание (зависимости, конфиги)

**Примеры:**
```bash
git commit -m "feat(ui): add highlight card component"
git commit -m "fix(db): correct date format in highlights schema"
git commit -m "refactor(api): extract highlight queries to separate module"
git commit -m "docs(readme): add deployment instructions"
```

**Требования к коммитам:**
1. **Атомарность** — один коммит = одна логическая задача
2. **Понятность** — сообщение описывает ЧТО и ПОЧЕМУ, не КАК
3. **Английский язык** — все сообщения на английском
4. **Строчные буквы** — первое слово с маленькой буквы
5. **Без точки в конце** — subject без точки на конце

### Рабочий процесс

#### 1. Начало работы над фичей

```bash
# Обновить main
git checkout main
git pull origin main

# Создать фича-ветку
git checkout -b feature/nazvanie-fichi

# Работать, коммитить атомарно
git add <files>
git commit -m "feat(scope): opisanie"

# Пуш ветки
git push -u origin feature/nazvanie-fichi
```

#### 2. Создание Pull Request

```bash
# Создать PR через GitHub CLI
gh pr create \
  --title "feat: kratkoe-opisanie" \
  --body "## Что сделано
- Punkt 1
- Punkt 2

## Как проверить
1. Shag 1
2. Shag 2

Closes #<issue-number>"
```

**Шаблон описания PR:**
```markdown
## Changes
- Brief description of changes

## Testing
- How to test these changes

## Screenshots (if UI)
<!-- Add screenshots -->

Closes #<issue-number>
```

#### 3. Code Review & Merge

```bash
# Проверить статус PR
gh pr view

# Посмотреть CI статус
gh pr checks

# Сквош-мерж (для фич)
git checkout main
git pull origin main
gh pr merge --squash --delete-branch

# Обычный мерж (для hotfix)
gh pr merge --merge --delete-branch
```

**Правила мержа:**
- **Squash merge** — для feature/bugfix веток (чистая история main)
- **Regular merge** — для long-running веток, если нужна полная история
- **Fast-forward** — никогда, всегда через PR

### Работа с конфликтами

```bash
# При конфликте при rebase/merge
git status                    # Посмотреть конфликтные файлы
# Решить конфликты в файлах
git add <resolved-files>
git rebase --continue         # или git merge --continue

# Если нужно отменить
git rebase --abort            # или git merge --abort
```

### Синхронизация веток

```bash
# Обновить feature-ветку из main
git checkout feature/x
git fetch origin
git rebase origin/main

# Force push после rebase (если ветка уже на GitHub)
git push --force-with-lease origin feature/x
```

### Полезные команды

```bash
# Быстрый просмотр статуса
git status -sb

# Лог с графом
git log --graph --oneline --decorate --all -15

# Что изменится при push
git diff --stat origin/main

# Amend последнего коммита (если ещё не запушен)
git commit --amend --no-edit

# Список веток
git branch -vv

# Удалить локальную ветку
git branch -D feature/old-branch

# Удалить remote ветки, которых больше нет на сервере
git fetch --prune
```

### Когда делать коммит

**Коммить ЧАСТО:**
- После завершения одной логической задачи
- Перед переключением на другую задачу
- Перед большим рефакторингом (чекпоинт)
- После исправления CR замечаний

**НЕ коммить:**
- Нерабочий/ломающий билд код (если только не WIP-коммит)
- Секреты, API keys, .env файлы
- Временные файлы, логи

### WIP коммиты

Если нужно сохранить промежуточное состояние:

```bash
git commit -m "wip: description [ci skip]"

# Потом --amend перед финальным пушем
git commit --amend -m "feat: final description"
```

---

## 13. Testing Checklist

### Local Development
- [ ] Form validation works (empty fields, invalid dates)
- [ ] Job date validation: start < end
- [ ] Tags persist correctly (JSONB serialization)
- [ ] Metrics display and export correctly
- [ ] Search filters combine with AND logic
- [ ] Export JSON format matches spec
- [ ] Backup/Import preserves all fields
- [ ] Dark mode renders correctly

### Vercel Deployment
- [ ] Turso database created and accessible
- [ ] Drizzle migrations applied to Turso
- [ ] Environment variables (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) configured in Vercel Dashboard
- [ ] Build completes without errors
- [ ] Database queries work in production (Edge or Node runtime)
- [ ] Server Actions function correctly with Turso
- [ ] No runtime errors in Vercel Logs

**Design System:** Tailark Veil (https://tailark.com/veil)  
**Deployment:** Vercel (https://vercel.com)  
**Database:** Turso (https://turso.tech) — libSQL/SQLite edge database  
**Repository:** https://github.com/vladprrs/build-cv  
**Last Updated:** 2026-02-03  
**Version:** 1.0 MVP
