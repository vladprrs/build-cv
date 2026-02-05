# Build CV

A headless CMS for managing professional career data. Store atomic "highlights" (achievements, projects, responsibilities) with rich metadata and export structured data for AI-powered resume generation.

**[Live Demo](https://build-cv-henna.vercel.app)**

## Features

- **Atomic Highlights** — Break down experience into granular, reusable units
- **Rich Metadata** — Attach metrics, skills, domains, and keywords to each highlight
- **Timeline View** — Visualize career progression chronologically
- **Smart Search** — Filter by type, skills, domains, and metrics
- **RAG Export** — Export structured JSON/Markdown for AI resume generation
- **n8n Workflow Export** — Generate ready-to-import n8n workflows for automated resume optimization via Telegram bot
- **Backup/Restore** — Full database export and import with human-readable slugs

## n8n Workflow Export

The standout feature: generate complete n8n workflows that create Telegram bots for automated resume optimization.

**Two architectures available:**

| Architecture | Nodes | Best For |
|-------------|-------|----------|
| HTTP Chain | 21 | Predictable, debuggable flows |
| AI Agent | 16 | Dynamic, context-aware processing |

Both include:
- Telegram bot integration
- OpenRouter LLM integration (GPT-4o-mini default)
- Job posting parser
- Evidence selector (matches highlights to requirements)
- Resume generator with validation loop
- Hallucination and AI detection checks

See [docs/agents.md](docs/agents.md) for detailed architecture documentation.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** Turso (libSQL/SQLite edge)
- **ORM:** Drizzle ORM
- **Styling:** Tailwind CSS + shadcn/ui
- **Validation:** Zod
- **Deployment:** Vercel

## Quick Start

### Prerequisites
- Node.js 20+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/vladprrs/build-cv.git
cd build-cv

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Database Setup

**Option 1: Local SQLite (simplest)**
```bash
# In .env.local, uncomment:
LOCAL_DB_PATH="./cv_data.db"

# Push schema
npm run db:push

# (Optional) Seed test data
npm run db:seed
```

**Option 2: Turso Cloud**
```bash
# Get credentials from https://turso.tech
TURSO_DATABASE_URL="libsql://your-db.turso.io"
TURSO_AUTH_TOKEN="your-token"

# Run migrations
npm run db:migrate
```

## Project Structure

```
src/
├── app/                  # Next.js App Router
│   ├── actions.ts        # Server Actions (CRUD, export)
│   ├── page.tsx          # Timeline view
│   ├── jobs/             # Job management
│   ├── highlights/       # Highlights table view
│   ├── export/           # RAG export builder
│   └── backup/           # Backup/restore
├── components/
│   ├── ui/               # shadcn/ui components
│   └── *.tsx             # Feature components
├── db/
│   ├── schema.ts         # Drizzle schema (jobs, highlights)
│   ├── index.ts          # Database connection
│   └── seed.ts           # Test data seeder
└── lib/
    ├── n8n/              # n8n workflow generator
    │   ├── workflow.ts   # Main generator
    │   ├── prompts.ts    # LLM prompts
    │   └── types.ts      # TypeScript types
    └── export-utils.ts   # RAG formatting utilities
```

## Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # ESLint

# Database
npm run db:generate      # Generate migrations
npm run db:migrate       # Apply migrations
npm run db:push          # Push schema (dev only)
npm run db:studio        # Open Drizzle Studio GUI
npm run db:seed          # Seed test data
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TURSO_DATABASE_URL` | Turso database URL | Yes (prod) |
| `TURSO_AUTH_TOKEN` | Turso auth token | Yes (prod) |
| `LOCAL_DB_PATH` | Local SQLite path | No (dev fallback) |

## Deployment

### Vercel (Recommended)

1. Fork this repository
2. Import to [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

The app auto-detects Turso credentials and falls back to local SQLite if not configured.

## Documentation

- [Agent Architecture](docs/agents.md) — n8n agent-based workflow details
- [n8n Workflow Plan](docs/n8n-telegram-workflow-plan.md) — Full implementation plan
- [Roadmap](ROADMAP.md) — Feature roadmap
- [UI/UX Spec](UIUX.md) — Design specification

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

For security vulnerabilities, please see our [Security Policy](SECURITY.md).

## License

[MIT](LICENSE)
