# Build CV

Headless CMS for managing professional career data. Store atomic "highlights" of experience with rich metadata and enable structured export for AI resume generation.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** Turso (libSQL/SQLite edge database)
- **ORM:** Drizzle ORM
- **Styling:** Tailwind CSS + shadcn/ui
- **Deployment:** Vercel

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── page.tsx         # Dashboard
│   ├── highlights/      # Highlights management
│   ├── export/          # RAG Export
│   └── layout.tsx       # Root layout
├── components/
│   └── ui/              # shadcn components
├── db/
│   ├── schema.ts        # Drizzle schema
│   └── index.ts         # Database connection
└── lib/
    ├── types.ts         # TypeScript types
    └── utils.ts         # Utilities
```

## Getting Started

### Prerequisites

- Node.js 20+
- Turso account (for production database)

### Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database Setup

```bash
# Generate migrations
npm run db:generate

# Push schema (development)
npm run db:push

# Run migrations
npm run db:migrate

# Open Drizzle Studio
npm run db:studio
```

### Environment Variables

Create `.env.local`:

```bash
# Turso Database (production)
TURSO_DATABASE_URL="libsql://your-db.turso.io"
TURSO_AUTH_TOKEN="your-token"

# Local development
LOCAL_DB_PATH="./cv_data.db"
```

## Deployment

### Vercel (Recommended)

1. Import your GitHub repository on [Vercel](https://vercel.com)
2. Add environment variables in Project Settings
3. Deploy

## License

Private
